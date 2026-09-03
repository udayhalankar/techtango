import React, {
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  IconButton,
  Typography,
} from "@mui/material";

import AddRoundedIcon from
  "@mui/icons-material/AddRounded";

import ChevronLeftRoundedIcon from
  "@mui/icons-material/ChevronLeftRounded";

import ChevronRightRoundedIcon from
  "@mui/icons-material/ChevronRightRounded";

import ExperienceRow from
  "./ExperienceRow";

import AddRowModal from
  "./AddRowModal";

import ViewSidebarIcon from
  "@mui/icons-material/ViewSidebar";


  function sameRowColumns(
  left = [],
  right = []
) {

  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !==
      right.length
  ) {
    return false;
  }


  return left.every(
    (
      value,
      index
    ) =>
      Number(value) ===
      Number(
        right[index]
      )
  );
}

function SidebarShell({
  side,
  config,
  collapsed = false,
  onCollapsedChange,
  children,
}) {

  if (!config?.enabled) {
    return null;
  }


  const collapsible =
    config?.collapsible !== false;


  const isLeft =
    side === "left";


  return (
    <Box
      sx={{
        position: "relative",

        width: "100%",
        minWidth: 0,
        minHeight: collapsed ? 42 : 400,

        border: "1px solid #e0e7ee",
        borderRadius: "7px",

        bgcolor: "#fff",

        overflow: "hidden",
      }}
    >

      <Box
        sx={{
          minHeight: 36,

          px: collapsed ? 0.4 : 1,

          display: "flex",
          alignItems: "center",

          justifyContent:
            collapsed
              ? "center"
              : "space-between",

          borderBottom:
            collapsed
              ? "none"
              : "1px solid #eef2f5",
        }}
      >

        {!collapsed && (
          <Typography
            noWrap
            sx={{
              fontSize: 10,
              fontWeight: 700,
              color: "#62778a",
            }}
          >
            {isLeft
              ? "Left Sidebar"
              : "Right Sidebar"}
          </Typography>
        )}


        {collapsible && (
          <IconButton
            size="small"

            onClick={() =>
              onCollapsedChange?.(
                !collapsed
              )
            }

            sx={{
              width: 25,
              height: 25,
            }}
          >

            {isLeft ? (
              collapsed ? (
                <ChevronRightRoundedIcon
                  sx={{
                    fontSize: 16,
                  }}
                />
              ) : (
                <ChevronLeftRoundedIcon
                  sx={{
                    fontSize: 16,
                  }}
                />
              )
            ) : collapsed ? (
              <ChevronLeftRoundedIcon
                sx={{
                  fontSize: 16,
                }}
              />
            ) : (
              <ChevronRightRoundedIcon
                sx={{
                  fontSize: 16,
                }}
              />
            )}

          </IconButton>
        )}

      </Box>


      {!collapsed && (
        <Box
          sx={{
            p: 1,
          }}
        >

          {children || (
            <Box
              sx={{
                minHeight: 120,

                display: "grid",
                placeItems: "center",

                border:
                  "1px dashed #d6e0e8",

                borderRadius:
                  "3px",
              }}
            >
              <Typography
                sx={{
                  fontSize: 9.5,
                  color: "#9aa8b6",
                }}
              >
                Sidebar components
              </Typography>
            </Box>
          )}

        </Box>
      )}

    </Box>
  );
}


function HeroSection({
  hero,
}) {

  if (
    !hero?.enabled
  ) {
    return null;
  }


  const config =
    hero?.config ||
    {};


  return (
    <Box
      sx={{
        px: {
          xs:
            2,

          md:
            2.5,
        },

        py: {
          xs:
            2,

          md:
            2.4,
        },

        border:
          "1px solid #dfe7ed",

        borderRadius:
        "7px",

        bgcolor:
          "#fff",
      }}
    >

      <Typography
        sx={{
          fontSize: {
            xs:
              20,

            md:
              24,
          },

          lineHeight:
            1.15,

          fontWeight:
            700,

          color:
            "#17324a",
        }}
      >
        {config.title ||
          "Enterprise Experience"}
      </Typography>


      {config.subtitle && (

        <Typography
          sx={{
            mt: 0.7,

            fontSize: 12,

            fontWeight:
              500,

            color:
              "#506b81",
          }}
        >
          {
            config.subtitle
          }
        </Typography>

      )}


      {config.description && (

        <Typography
          sx={{
            mt: 0.9,

            maxWidth: 820,

            fontSize: 10.5,

            lineHeight:
              1.55,

            color:
              "#7a8c9d",
          }}
        >
          {
            config.description
          }
        </Typography>

      )}

    </Box>
  );
}


function EmptyExperience({
  onAddRow,
}) {

  return (
    <Box
      sx={{
        minHeight:
          260,

        display:
          "grid",

        placeItems:
          "center",

        border:
          "1px dashed #cfdbe5",

          borderRadius:
      "3px",

        bgcolor:
          "#fff",
      }}
    >

      <Box
        sx={{
          textAlign:
            "center",
        }}
      >

        <Box
          sx={{
            width: 38,
            height: 38,

            mx: "auto",
            mb: 1,

            display:
              "grid",

            placeItems:
              "center",

            bgcolor:
              "#eef6fb",

            color:
              "#2188a0",
          }}
        >

          <AddRoundedIcon
            sx={{
              fontSize: 20,
            }}
          />

        </Box>


        <Typography
          sx={{
            fontSize: 12,

            fontWeight: 700,

            color:
              "#405a70",
          }}
        >
          Build your experience
        </Typography>


        <Typography
          sx={{
            mt: 0.4,

            mb: 1.3,

            fontSize: 9.5,

            color:
              "#8999a8",
          }}
        >
          Add your first 12-column content row.
        </Typography>


        <Button
          size="small"

          variant="outlined"

          startIcon={
            <AddRoundedIcon
              sx={{
                fontSize:
                  "16px !important",
              }}
            />
          }

          onClick={
            onAddRow
          }

          sx={{
            textTransform:
              "none",

            fontSize: 10.5,
          }}
        >
          Add First Row
        </Button>

      </Box>

    </Box>
  );
}


export default function ExperienceCanvas({
  experience,

  onExperienceChange,

  onAddComponent,

  renderComponent,

  renderLeftSidebar,

  renderRightSidebar,
}) {

  const [
    addRowOpen,
    setAddRowOpen,
  ] =
    useState(false);

  const [
  editingRow,
  setEditingRow,
] =
  useState(null);

  const [
  leftSidebarCollapsed,
  setLeftSidebarCollapsed,
] = useState(
  Boolean(
    experience
      ?.shell
      ?.leftSidebar
      ?.defaultCollapsed
  )
);


  const [
    rightSidebarCollapsed,
    setRightSidebarCollapsed,
  ] = useState(
    Boolean(
      experience
        ?.shell
        ?.rightSidebar
        ?.defaultCollapsed
    )
  );

  const page =
    experience?.page ||
    {};


  const shell =
    experience?.shell ||
    {};


  const rows =
    Array.isArray(
      experience?.rows
    )
      ? experience.rows
      : [];


  const components =
    experience?.components ||
    {};


  const leftSidebar =
    shell?.leftSidebar ||
    {};


  const rightSidebar =
    shell?.rightSidebar ||
    {};


  const leftEnabled =
    Boolean(
      leftSidebar.enabled
    );


  const rightEnabled =
    Boolean(
      rightSidebar.enabled
    );


  const leftColumns =
  leftEnabled &&
  !leftSidebarCollapsed
    ? Number(
        leftSidebar.columns ||
        2
      )
    : 0;


const rightColumns =
  rightEnabled &&
  !rightSidebarCollapsed
    ? Number(
        rightSidebar.columns ||
        2
      )
    : 0;


const leftCollapsedColumns =
  0;


const rightCollapsedColumns =
  0;


const mainColumns =
  Math.max(
    1,

    12 -
      leftColumns -
      rightColumns
  );

 /*
 * KPI layout rule:
 *
 * Always allow up to 6 KPI cards,
 * regardless of sidebar configuration.
 */
const maxKpiCards =
  6;


  const updateRows =
    (
      nextRows
    ) => {

      onExperienceChange?.({
        ...experience,

        rows:
          nextRows,
      });
    };


  const handleAddRow =
  (
    row
  ) => {

    updateRows([
      ...rows,
      row,
    ]);


    setEditingRow(
      null
    );
  };


  const handleDeleteRow =
    (
      row
    ) => {

      const nextRows =
        rows.filter(
          (
            item
          ) =>
            item.id !==
            row.id
        );


      const slotIds =
        new Set(
          row?.slots?.map(
            (
              slot
            ) =>
              slot.slotId
          ) ||
          []
        );


      const nextComponents =
        Object.fromEntries(
          Object.entries(
            components
          ).filter(
            ([
              slotId,
            ]) =>
              !slotIds.has(
                slotId
              )
          )
        );


      onExperienceChange?.({
        ...experience,

        rows:
          nextRows,

        components:
          nextComponents,
      });
    };


  const handleDuplicateRow =
    (
      row
    ) => {

      const newRowId =
        `row-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;


      const slotMap =
        {};


      const newSlots =
        (
          row.slots ||
          []
        ).map(
          (
            slot,
            index
          ) => {

            const newSlotId =
              `${newRowId}-slot-${index + 1}`;


            slotMap[
              slot.slotId
            ] =
              newSlotId;


            return {
              ...slot,

              slotId:
                newSlotId,
            };
          }
        );


      const nextComponents = {
        ...components,
      };


      Object.entries(
        slotMap
      ).forEach(
        ([
          oldSlotId,
          newSlotId,
        ]) => {

          const existing =
            components[
              oldSlotId
            ];


          if (!existing) {
            return;
          }


          nextComponents[
            newSlotId
          ] = {
            ...existing,

            layout: {
              ...(
                existing
                  .layout ||
                {}
              ),

              mergedSlots:
                [],
            },
          };
        }
      );


      const newRow = {
        ...row,

        id:
          newRowId,

        slots:
          newSlots,

        label:
          `${row.label || "Row"} Copy`,
      };


      const rowIndex =
        rows.findIndex(
          (
            item
          ) =>
            item.id ===
            row.id
        );


      const nextRows = [
        ...rows,
      ];


      nextRows.splice(
        rowIndex + 1,
        0,
        newRow
      );


      onExperienceChange?.({
        ...experience,

        rows:
          nextRows,

        components:
          nextComponents,
      });
    };


  const moveRow =
    (
      row,
      direction
    ) => {

      const index =
        rows.findIndex(
          (
            item
          ) =>
            item.id ===
            row.id
        );


      if (
        index < 0
      ) {
        return;
      }


      const targetIndex =
        index +
        direction;


      if (
        targetIndex < 0 ||
        targetIndex >=
          rows.length
      ) {
        return;
      }


      const nextRows = [
        ...rows,
      ];


      [
        nextRows[
          index
        ],

        nextRows[
          targetIndex
        ],
      ] = [
        nextRows[
          targetIndex
        ],

        nextRows[
          index
        ],
      ];


      updateRows(
        nextRows
      );
    };


  const handleConfigureRow =
  (
    row
  ) => {

    if (
      !row?.id
    ) {
      return;
    }


    setEditingRow(
      row
    );


    setAddRowOpen(
      true
    );
  };


  const handleUpdateRow =
  (
    updatedRow,
    originalRow
  ) => {

    if (
      !updatedRow?.id ||
      !originalRow?.id
    ) {
      return false;
    }


    const oldSlots =
      Array.isArray(
        originalRow?.slots
      )
        ? originalRow.slots
        : [];


    const newSlots =
      Array.isArray(
        updatedRow?.slots
      )
        ? updatedRow.slots
        : [];


    const oldSlotIds =
      new Set(
        oldSlots.map(
          (
            slot
          ) =>
            slot.slotId
        )
      );


    const newSlotIds =
      new Set(
        newSlots.map(
          (
            slot
          ) =>
            slot.slotId
        )
      );


    const slotsById =
      Object.fromEntries(
        newSlots.map(
          (
            slot
          ) => [
            slot.slotId,
            slot,
          ]
        )
      );


    /*
     * COMPONENT TYPES
     *
     * Media is persisted as "media"
     * but row acceptance still uses "image".
     */
    const normalizeComponentType =
      (
        type
      ) => {

        if (
          type ===
          "media"
        ) {
          return "image";
        }


        return type;
      };


    const componentsToRemove =
      new Set();


    /* =============================================================
       1. SLOTS REMOVED BY SMALLER LAYOUT

       Example:
       4 slots -> 3 slots

       component in slot 4 cannot survive.
    ============================================================= */

    oldSlotIds.forEach(
      (
        slotId
      ) => {

        if (
          !newSlotIds.has(
            slotId
          ) &&
          components[
            slotId
          ]
        ) {

          componentsToRemove.add(
            slotId
          );
        }
      }
    );


    /* =============================================================
       2. COMPONENT IS NOT VALID FOR NEW ROW TYPE

       Example:

       Mixed Row
         Chart + KPI + Text

       changed to:

       KPI Row

       Chart/Text are no longer valid.
    ============================================================= */

    newSlots.forEach(
      (
        slot
      ) => {

        const component =
          components[
            slot.slotId
          ];


        if (
          !component
        ) {
          return;
        }


        const acceptedTypes =
          Array.isArray(
            slot.accepts
          )
            ? slot.accepts
            : [];


        const componentType =
          normalizeComponentType(
            component.type
          );


        if (
          !acceptedTypes.includes(
            componentType
          )
        ) {

          componentsToRemove.add(
            slot.slotId
          );
        }
      }
    );


    /* =============================================================
       CONFIRM ONLY IF COMPONENTS WOULD ACTUALLY BE LOST
    ============================================================= */

    if (
      componentsToRemove.size >
      0
    ) {

      const confirmed =
        window.confirm(
          `Changing this row will remove ${
            componentsToRemove.size
          } component${
            componentsToRemove.size ===
            1
              ? ""
              : "s"
          } that no longer fit the selected row type/layout.\n\nContinue?`
        );


      if (
        !confirmed
      ) {

        return false;
      }
    }


    const nextComponents = {
      ...components,
    };


    componentsToRemove.forEach(
      (
        slotId
      ) => {

        delete nextComponents[
          slotId
        ];
      }
    );


    /* =============================================================
       IF STRUCTURE CHANGED, CLEAR MERGES

       A merge relationship from the old slot geometry may no
       longer be valid in the new geometry.

       We keep the component itself, but reset its merge metadata.
    ============================================================= */

    const structureChanged =
      originalRow.type !==
        updatedRow.type ||
      originalRow.layoutId !==
        updatedRow.layoutId ||
      !sameRowColumns(
        originalRow.columns,
        updatedRow.columns
      );


    if (
      structureChanged
    ) {

      newSlots.forEach(
        (
          slot
        ) => {

          const component =
            nextComponents[
              slot.slotId
            ];


          if (
            !component
          ) {
            return;
          }


          nextComponents[
            slot.slotId
          ] = {
            ...component,

            layout: {
              ...(
                component
                  ?.layout ||
                {}
              ),

              span:
                1,

              mergedSlots:
                [],
            },
          };
        }
      );
    }


    const nextRows =
      rows.map(
        (
          row
        ) =>
          row.id ===
          originalRow.id
            ? updatedRow
            : row
      );


    onExperienceChange?.({
      ...experience,

      rows:
        nextRows,

      components:
        nextComponents,
    });


    setEditingRow(
      null
    );


    return true;
  };


  return (
    <Box
      sx={{
        width:
          "100%",

        minHeight:
          "100%",

        bgcolor:
          page.backgroundColor ||
          "#f5f7fa",
      }}
    >

      <Box
        sx={{
          width:
            "100%",

          maxWidth:
            page.maxWidth ||
            1440,

          mx:
            "auto",

          p:
            `${page.padding ?? 16}px`,
        }}
      >

        {/* HERO */}

        <HeroSection
          hero={
            experience?.hero
          }
        />


          {/* COLLAPSED SIDEBAR RESTORE CONTROLS */}

{(
  leftEnabled &&
  leftSidebarCollapsed
) ||
(
  rightEnabled &&
  rightSidebarCollapsed
) ? (

  <Box
    sx={{
      mt:
        experience
          ?.hero
          ?.enabled
          ? `${Math.max(
              6,
              Number(
                page.rowGap ??
                16
              ) / 2
            )}px`
          : 0,

      mb:
        0.5,

      minHeight:
        28,

      display:
        "flex",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    }}
  >

    {/* LEFT RESTORE */}

    <Box
      sx={{
        width:
          32,

        display:
          "flex",

        justifyContent:
          "flex-start",
      }}
    >

      {leftEnabled &&
        leftSidebarCollapsed && (

        <IconButton
          size="small"

          title="Open left sidebar"

          onClick={() =>
            setLeftSidebarCollapsed(
              false
            )
          }

          sx={{
            width:
              28,

            height:
              28,

            borderRadius:
              "3px",

            color:
              "#63788a",

            "&:hover": {
              bgcolor:
                "#eef4f7",

              color:
                "#2188a0",
            },
          }}
        >

          <ViewSidebarIcon
            sx={{
              fontSize:
                18,
            }}
          />

        </IconButton>

      )}

    </Box>


    {/* RIGHT RESTORE */}

    <Box
      sx={{
        width:
          32,

        display:
          "flex",

        justifyContent:
          "flex-end",
      }}
    >

      {rightEnabled &&
        rightSidebarCollapsed && (

        <IconButton
          size="small"

          title="Open right sidebar"

          onClick={() =>
            setRightSidebarCollapsed(
              false
            )
          }

          sx={{
            width:
              28,

            height:
              28,

            borderRadius:
              "3px",

            color:
              "#63788a",

            "&:hover": {
              bgcolor:
                "#eef4f7",

              color:
                "#2188a0",
            },
          }}
        >

          <ViewSidebarIcon
            sx={{
              fontSize:
                18,

              transform:
                "scaleX(-1)",
            }}
          />

        </IconButton>

      )}

    </Box>

  </Box>

) : null}

        {/* PAGE SHELL */}

        <Box
          sx={{
            mt:
              experience
                ?.hero
                ?.enabled
                ? `${page.rowGap ?? 16}px`
                : 0,

            display:
              "grid",

            gridTemplateColumns:
              "repeat(12, minmax(0, 1fr))",

            gap:
              `${page.columnGap ?? 12}px`,

            alignItems:
              "start",
          }}
        >

          {/* LEFT SIDEBAR */}

          {leftEnabled &&
            !leftSidebarCollapsed && (

            <Box
                sx={{
                  gridColumn: {
                    xs: "span 12",

                    md:
                     `span ${leftColumns}`,
                  },

                  minWidth: 0,
                }}
              >

              <SidebarShell
                  side="left"

                  config={
                    leftSidebar
                  }

                  collapsed={
                    leftSidebarCollapsed
                  }

                  onCollapsedChange={
                    setLeftSidebarCollapsed
                  }
                >
                {
                  renderLeftSidebar?.(
                    leftSidebar
                  )
                }
              </SidebarShell>

            </Box>

          )}


          {/* MAIN */}

          <Box
            sx={{
              gridColumn: {
                xs: "span 12",
                md: `span ${mainColumns}`,
              },

              minWidth: 0,
            }}
          >

            <Box
              sx={{
                display:
                  "flex",

                flexDirection:
                  "column",

                gap:
                  `${page.rowGap ?? 16}px`,
              }}
            >

              {rows.length ===
              0 ? (

                <EmptyExperience
                    onAddRow={() => {

                      setEditingRow(
                        null
                      );


                      setAddRowOpen(
                        true
                      );
                    }}
                  />

              ) : (

                rows.map(
                  (
                    row
                  ) => (

                    <ExperienceRow
  key={
    row.id
  }

  row={
    row
  }

  components={
    components
  }

  columnGap={
    page.columnGap ??
    12
  }

  onAddComponent={
    onAddComponent
  }

  renderComponent={
    renderComponent
  }

  

  onConfigureRow={
    handleConfigureRow
  }

  onDuplicateRow={
    handleDuplicateRow
  }

  onMoveUp={
    (
      selectedRow
    ) =>
      moveRow(
        selectedRow,
        -1
      )
  }

  onMoveDown={
    (
      selectedRow
    ) =>
      moveRow(
        selectedRow,
        1
      )
  }

  onDeleteRow={
    handleDeleteRow
  }
/>

                  )
                )

              )}


              {/* ALWAYS AVAILABLE */}

              {rows.length >
                0 && (

                <Button
                  variant="outlined"

                  startIcon={
                    <AddRoundedIcon
                      sx={{
                        fontSize:
                          "16px !important",
                      }}
                    />
                  }

                  onClick={() => {

  setEditingRow(
    null
  );

  setAddRowOpen(
    true
  );
}}

                  sx={{
                    minHeight:
                      38,

                    alignSelf:
                      "stretch",

                    borderStyle:
                      "dashed",

                    borderColor:
                      "#c8d7e3",

                    bgcolor:
                      "rgba(255,255,255,.55)",

                    color:
                      "#477089",

                    textTransform:
                      "none",

                    fontSize:
                      10.5,

                    fontWeight:
                      600,

                    "&:hover": {
                      borderStyle:
                        "dashed",

                      borderColor:
                        "#2188a0",

                        borderRadius:
                        "3px",

                      bgcolor:
                        "#f7fcfd",
                    },
                  }}
                >
                  Add New Row
                </Button>

              )}

            </Box>

          </Box>


          {/* RIGHT SIDEBAR */}

          {rightEnabled &&
            !rightSidebarCollapsed && (

            <Box
                sx={{
                  gridColumn: {
                    xs: "span 12",

                    md:
                    `span ${rightColumns}`,
                  },

                  minWidth: 0,
                }}
              >

              <SidebarShell
                    side="right"

                    config={
                      rightSidebar
                    }

                    collapsed={
                      rightSidebarCollapsed
                    }

                    onCollapsedChange={
                      setRightSidebarCollapsed
                    }
                  >
                {
                  renderRightSidebar?.(
                    rightSidebar
                  )
                }
              </SidebarShell>

            </Box>

          )}

        </Box>

      </Box>


      {/* ADD ROW MODAL */}

     <AddRowModal
  open={
    addRowOpen
  }

  mode={
    editingRow
      ? "edit"
      : "create"
  }

  editRow={
    editingRow
  }

  maxKpiCards={
    maxKpiCards
  }

  onClose={() => {

    setAddRowOpen(
      false
    );


    setEditingRow(
      null
    );
  }}

  onAddRow={
    handleAddRow
  }

  onUpdateRow={
    handleUpdateRow
  }
/>

    </Box>
  );
}