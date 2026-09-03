import React from "react";

import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";

import MoreVertRoundedIcon from
  "@mui/icons-material/MoreVertRounded";

import ExperienceSlot from
  "./ExperienceSlot";


export default function ExperienceRow({
  row,

  components = {},

  columnGap = 12,

  onAddComponent,

  renderComponent,

  onConfigureRow,
  onDuplicateRow,
  onMoveUp,
  onMoveDown,
  onDeleteRow,
}) {

  const [
    anchorEl,
    setAnchorEl,
  ] =
    React.useState(null);


  const slots =
    row?.slots ||
    [];


  const consumedSlotIds =
    React.useMemo(
      () => {

        const consumed =
          new Set();


        Object.values(
          components ||
          {}
        ).forEach(
          (
            component
          ) => {

            const mergedSlots =
              component
                ?.layout
                ?.mergedSlots;


            if (
              Array.isArray(
                mergedSlots
              )
            ) {

              mergedSlots.forEach(
                (
                  slotId
                ) =>
                  consumed.add(
                    slotId
                  )
              );
            }
          }
        );


        return consumed;
      },

      [
        components,
      ]
    );


  return (
    <Box
      sx={{
        position:
          "relative",

        width:
          "100%",
      }}
    >

      {/* ROW HEADER */}

      <Box
        sx={{
          minHeight:
            28,

          mb:
            0.5,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",
        }}
      >

        <Typography
          sx={{
            fontSize:
              9.5,

            fontWeight:
              600,

            color:
              "#8a9aaa",

            textTransform:
              "uppercase",

            letterSpacing:
              ".04em",
          }}
        >
          {row?.label ||
            row?.type ||
            "Row"}
        </Typography>


        <IconButton
          size="small"

          onClick={(e) =>
            setAnchorEl(
              e.currentTarget
            )
          }

          sx={{
            width:
              26,

            height:
              26,
          }}
        >

          <MoreVertRoundedIcon
            sx={{
              fontSize:
                16,
            }}
          />

        </IconButton>


        <Menu
          anchorEl={
            anchorEl
          }

          open={
            Boolean(
              anchorEl
            )
          }

          onClose={() =>
            setAnchorEl(
              null
            )
          }
        >

          <MenuItem
            onClick={() => {

              setAnchorEl(
                null
              );

              onConfigureRow?.(
                row
              );
            }}
          >
            Configure Row
          </MenuItem>


          <MenuItem
            onClick={() => {

              setAnchorEl(
                null
              );

              onDuplicateRow?.(
                row
              );
            }}
          >
            Duplicate Row
          </MenuItem>


          <MenuItem
            onClick={() => {

              setAnchorEl(
                null
              );

              onMoveUp?.(
                row
              );
            }}
          >
            Move Up
          </MenuItem>


          <MenuItem
            onClick={() => {

              setAnchorEl(
                null
              );

              onMoveDown?.(
                row
              );
            }}
          >
            Move Down
          </MenuItem>


          <MenuItem
            onClick={() => {

              setAnchorEl(
                null
              );

              onDeleteRow?.(
                row
              );
            }}

            sx={{
              color:
                "#c13c3c",
            }}
          >
            Delete Row
          </MenuItem>

        </Menu>

      </Box>


      {/* 12 COLUMN GRID */}

      <Box
        sx={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(12, minmax(0, 1fr))",

          columnGap:
            `${columnGap}px`,

          rowGap:
            `${columnGap}px`,
        }}
      >

        {slots.map(
          (
            slot
          ) => {

            if (
              consumedSlotIds.has(
                slot.slotId
              )
            ) {
              return null;
            }


            const component =
              components[
                slot.slotId
              ];


            const mergedSlots =
              Array.isArray(
                component
                  ?.layout
                  ?.mergedSlots
              )
                ? component
                    .layout
                    .mergedSlots
                : [];


            const mergedWidth =
              mergedSlots.reduce(
                (
                  total,
                  mergedSlotId
                ) => {

                  const mergedSlot =
                    slots.find(
                      (
                        item
                      ) =>
                        item.slotId ===
                        mergedSlotId
                    );


                  return (
                    total +
                    Number(
                      mergedSlot
                        ?.span ||
                      0
                    )
                  );
                },

                0
              );


            const span =
              Math.min(
                12,

                Number(
                  slot.span ||
                  12
                ) +
                  mergedWidth
              );


            return (
              <Box
                key={
                  slot.slotId
                }

                sx={{
                  gridColumn: {
                    xs:
                      "span 12",

                    sm:
                      span <= 4
                        ? "span 6"
                        : "span 12",

                    md:
                      `span ${span}`,
                  },

                  minWidth:
                    0,
                }}
              >

                <ExperienceSlot
                  slot={
                    slot
                  }

                  component={
                    component
                  }

                  columnGap={
                    columnGap
                  }

                  onAddComponent={
                    onAddComponent
                  }

                  renderComponent={
                    renderComponent
                  }
                />

              </Box>
            );
          }
        )}

      </Box>

    </Box>
  );
}