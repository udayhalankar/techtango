import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";

import CloseRoundedIcon from
  "@mui/icons-material/CloseRounded";

import DashboardRoundedIcon from
  "@mui/icons-material/DashboardRounded";

import TableChartOutlinedIcon from
  "@mui/icons-material/TableChartOutlined";

import BarChartRoundedIcon from
  "@mui/icons-material/BarChartRounded";

import ArticleOutlinedIcon from
  "@mui/icons-material/ArticleOutlined";

import GridViewRoundedIcon from
  "@mui/icons-material/GridViewRounded";

import SmartToyOutlinedIcon from
  "@mui/icons-material/SmartToyOutlined";

import TuneRoundedIcon from
  "@mui/icons-material/TuneRounded";

import {
  ACCEPTS_BY_ROW_TYPE,
  KPI_LAYOUTS,
  ROW_LAYOUTS,
  ROW_TYPES,
} from "../enterpriseExperienceConstants";


const ROW_ICONS = {
  kpi:
    DashboardRoundedIcon,

  data:
    TableChartOutlinedIcon,

  chart:
    BarChartRoundedIcon,

  content:
    ArticleOutlinedIcon,

  mixed:
    GridViewRoundedIcon,

  ai:
    SmartToyOutlinedIcon,

  custom:
    TuneRoundedIcon,
};


function makeRowId() {

  return (
    `row-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`
  );
}


function makeSlotId(
  rowId,
  index
) {

  return (
    `${rowId}-slot-${index + 1}`
  );
}


function sameColumns(
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


function RowTypeCard({
  item,
  selected,
  onClick,
}) {

  const Icon =
    ROW_ICONS[
      item.value
    ] ||
    GridViewRoundedIcon;


  return (
    <Box
      onClick={
        onClick
      }

      sx={{
        p: 1.4,

        minHeight: 92,

        border:
          selected
            ? "1px solid #2188a0"
            : "1px solid #dce6ee",

        bgcolor:
          selected
            ? "#eef8fa"
            : "#fff",

        cursor:
          "pointer",

        transition:
          "all .15s ease",

        "&:hover": {
          borderColor:
            "#73b6c4",

          bgcolor:
            selected
              ? "#eef8fa"
              : "#fafcfd",
        },
      }}
    >

      <Box
        sx={{
          display:
            "flex",

          alignItems:
            "flex-start",

          gap: 1,
        }}
      >

        <Box
          sx={{
            width: 34,
            height: 34,

            flex:
              "0 0 auto",

            display:
              "grid",

            placeItems:
              "center",

            bgcolor:
              selected
                ? "#d9eef2"
                : "#eef4f8",

            color:
              "#2188a0",
          }}
        >

          <Icon
            sx={{
              fontSize: 18,
            }}
          />

        </Box>


        <Box
          sx={{
            minWidth: 0,
          }}
        >

          <Typography
            sx={{
              fontSize: 11.5,

              fontWeight: 700,

              color:
                "#294158",
            }}
          >
            {item.label}
          </Typography>


          <Typography
            sx={{
              mt: 0.35,

              fontSize: 9.5,

              lineHeight: 1.45,

              color:
                "#8090a0",
            }}
          >
            {item.description}
          </Typography>

        </Box>

      </Box>

    </Box>
  );
}


function LayoutPreview({
  columns,
  selected,
  label,
  onClick,
}) {

  return (
    <Box
      onClick={
        onClick
      }

      sx={{
        p: 1.1,

        border:
          selected
            ? "1px solid #2188a0"
            : "1px solid #dce5ec",

        bgcolor:
          selected
            ? "#f0f9fa"
            : "#fff",

        cursor:
          "pointer",

        transition:
          "all .15s ease",

        "&:hover": {
          borderColor:
            "#75b6c3",
        },
      }}
    >

      <Box
        sx={{
          height: 42,

          display:
            "grid",

          gridTemplateColumns:
            "repeat(12, minmax(0, 1fr))",

          gap: 0.35,
        }}
      >

        {columns.map(
          (
            span,
            index
          ) => (

            <Box
              key={
                `${span}-${index}`
              }

              sx={{
                gridColumn:
                  `span ${span}`,

                bgcolor:
                  selected
                    ? "#9ed1dc"
                    : "#dbe5ec",

                border:
                  selected
                    ? "1px solid #6db2c1"
                    : "1px solid #cad7e1",
              }}
            />

          )
        )}

      </Box>


      <Typography
        sx={{
          mt: 0.7,

          textAlign:
            "center",

          fontSize:
            9.5,

          fontWeight:
            selected
              ? 700
              : 500,

          color:
            selected
              ? "#216e80"
              : "#6f8192",
        }}
      >
        {label}
      </Typography>

    </Box>
  );
}





export default function AddRowModal({
  open,

  onClose,

  onAddRow,

  onUpdateRow,

  mode =
    "create",

  editRow =
    null,

  maxKpiCards = 6,
}) {

  const [
    rowType,
    setRowType,
  ] =
    useState(
      "mixed"
    );


  const [
    layoutId,
    setLayoutId,
  ] =
    useState(
      "4-4-4"
    );


useEffect(() => {

  if (
    !open
  ) {
    return;
  }


  /* =============================================================
     EDIT EXISTING ROW
  ============================================================= */

  if (
    mode ===
      "edit" &&
    editRow
  ) {

    const nextType =
      editRow?.type ||
      "mixed";


    setRowType(
      nextType
    );


    const sourceLayouts =
      nextType ===
      "kpi"
        ? KPI_LAYOUTS
        : ROW_LAYOUTS;


    /*
     * First try the persisted layoutId.
     *
     * If an older record does not have a valid layoutId,
     * derive it from its actual column distribution.
     */
    const matchingLayout =
      sourceLayouts.find(
        (
          layout
        ) =>
          layout.id ===
          editRow?.layoutId
      ) ||
      sourceLayouts.find(
        (
          layout
        ) =>
          sameColumns(
            layout.columns,
            editRow?.columns
          )
      );


    setLayoutId(
      matchingLayout?.id ||
      (
        nextType ===
        "kpi"
          ? "4"
          : "4-4-4"
      )
    );


    return;
  }


  /* =============================================================
     CREATE NEW ROW
  ============================================================= */

  setRowType(
    "mixed"
  );


  setLayoutId(
    "4-4-4"
  );

}, [
  open,
  mode,
  editRow,
]);


  const availableLayouts =
  useMemo(
    () => {

      if (
        rowType !==
        "kpi"
      ) {

        return ROW_LAYOUTS;
      }


      const filtered =
        KPI_LAYOUTS.filter(
          (
            layout
          ) =>
            layout.columns.length <=
            maxKpiCards
        );


      /*
       * When configuring an existing KPI row,
       * always keep its current layout available.
       *
       * Example:
       * existing row = 6 KPI cards
       * sidebar currently enabled
       *
       * We do not want Configure Row to force
       * that row down to 4 cards.
       */
      if (
        mode ===
          "edit" &&
        editRow?.type ===
          "kpi"
      ) {

        const currentLayout =
          KPI_LAYOUTS.find(
            (
              layout
            ) =>
              layout.id ===
              editRow?.layoutId
          ) ||
          KPI_LAYOUTS.find(
            (
              layout
            ) =>
              sameColumns(
                layout.columns,
                editRow?.columns
              )
          );


        if (
          currentLayout &&
          !filtered.some(
            (
              layout
            ) =>
              layout.id ===
              currentLayout.id
          )
        ) {

          return KPI_LAYOUTS.filter(
            (
              layout
            ) =>
              filtered.some(
                (
                  item
                ) =>
                  item.id ===
                  layout.id
              ) ||
              layout.id ===
              currentLayout.id
          );
        }
      }


      return filtered;

    },
    [
      rowType,
      maxKpiCards,
      mode,
      editRow,
    ]
  );


  useEffect(() => {

    if (
      !availableLayouts.length
    ) {
      return;
    }


    const exists =
      availableLayouts.some(
        (
          layout
        ) =>
          layout.id ===
          layoutId
      );


    if (!exists) {

      setLayoutId(
        availableLayouts[
          availableLayouts.length -
            1
        ].id
      );
    }

  }, [
    availableLayouts,
    layoutId,
  ]);


  const selectedLayout =
    availableLayouts.find(
      (
        layout
      ) =>
        layout.id ===
        layoutId
    ) ||
    availableLayouts[0];


  const selectedRowType =
    ROW_TYPES.find(
      (
        item
      ) =>
        item.value ===
        rowType
    );


  const handleSaveRow =
  () => {

    if (
      !selectedLayout
    ) {
      return;
    }


    const isEdit =
      mode ===
        "edit" &&
      Boolean(
        editRow?.id
      );


    /*
     * CREATE:
     * generate a new row ID.
     *
     * EDIT:
     * preserve the existing row ID.
     */
    const rowId =
      isEdit
        ? editRow.id
        : makeRowId();


    const accepts =
      ACCEPTS_BY_ROW_TYPE[
        rowType
      ] ||
      ACCEPTS_BY_ROW_TYPE
        .custom;


    const existingSlots =
      isEdit &&
      Array.isArray(
        editRow?.slots
      )
        ? editRow.slots
        : [];


    /*
     * Preserve existing slot IDs by POSITION.
     *
     * Example:
     *
     * Existing:
     * [slot-1][slot-2][slot-3]
     *
     * Configure to 4 slots:
     * [slot-1][slot-2][slot-3][new-slot-4]
     *
     * This allows existing components to survive.
     */
    const slots =
      selectedLayout
        .columns
        .map(
          (
            span,
            index
          ) => {

            const existingSlot =
              existingSlots[
                index
              ];


            return {
              ...(
                existingSlot ||
                {}
              ),

              slotId:
                existingSlot
                  ?.slotId ||
                makeSlotId(
                  rowId,
                  index
                ),

              span,

              accepts: [
                ...accepts,
              ],
            };
          }
        );


    const row = {

      ...(
        isEdit
          ? editRow
          : {}
      ),

      id:
        rowId,

      type:
        rowType,

      label:
        selectedRowType
          ?.label ||
        "Row",

      layoutId:
        selectedLayout.id,

      columns: [
        ...selectedLayout.columns,
      ],

      slots,

      style: {
        backgroundColor:
          "transparent",

        padding:
          0,

        ...(
          editRow?.style ||
          {}
        ),
      },
    };


    if (
      isEdit
    ) {

      /*
       * ExperienceCanvas decides how components
       * should be reconciled with the new slots.
       *
       * Returning false means:
       * user cancelled a destructive change.
       */
      const updated =
        onUpdateRow?.(
          row,
          editRow
        );


      if (
        updated ===
        false
      ) {
        return;
      }

    } else {

      onAddRow?.(
        row
      );
    }


    onClose?.();
  };


  return (
    <Dialog
      open={
        open
      }

      onClose={
        onClose
      }

      maxWidth="md"

      fullWidth

      PaperProps={{
        sx: {
          maxWidth: 860,
          borderRadius: "7x",
          overflow:
            "hidden",
        },
      }}
    >

      {/* HEADER */}

      <Box
        sx={{
          px: 2.2,
          py: 1.5,

          bgcolor:
            "#2188a0",

          color:
            "#fff",

          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize:
                17,

              fontWeight:
                700,
            }}
          >
            {mode === "edit"
              ? "Configure Row"
              : "Add Dashboard Row"}
          </Typography>


          <Typography
            sx={{
              mt: 0.2,

              fontSize: 10,

              color:
                "rgba(255,255,255,.88)",
            }}
          >
            {mode === "edit"
              ? "Change the row type or its 12-column layout."
              : "Choose the row purpose and its 12-column layout."}
          </Typography>

        </Box>


        <IconButton
          onClick={
            onClose
          }

          sx={{
            width: 30,
            height: 30,

            color:
              "#fff",

            bgcolor:
              "rgba(255,255,255,.12)",

            "&:hover": {
              bgcolor:
                "rgba(255,255,255,.2)",
            },
          }}
        >

          <CloseRoundedIcon
            sx={{
              fontSize: 18,
            }}
          />

        </IconButton>

      </Box>


      <DialogContent
        sx={{
          p: 2.2,

          bgcolor:
            "#f8fafc",
        }}
      >

        {/* ROW TYPE */}

        <Typography
          sx={{
            mb: 0.8,

            fontSize: 10.5,

            fontWeight: 700,

            color:
              "#506579",
          }}
        >
          Row Type
        </Typography>


        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              {
                xs:
                  "1fr",

                sm:
                  "repeat(2, 1fr)",

                md:
                  "repeat(3, 1fr)",
              },

            gap: 1,

            mb: 2.2,
          }}
        >

          {ROW_TYPES.map(
            (
              item
            ) => (

              <RowTypeCard
                key={
                  item.value
                }

                item={
                  item
                }

                selected={
                  rowType ===
                  item.value
                }

                onClick={() => {

                  setRowType(
                    item.value
                  );


                  if (
                    item.value ===
                    "kpi"
                  ) {

                    setLayoutId(
                      "4"
                    );

                  } else {

                    setLayoutId(
                      "4-4-4"
                    );
                  }
                }}
              />

            )
          )}

        </Box>


        {/* LAYOUT */}

        <Box
          sx={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap: 1,

            mb: 0.8,
          }}
        >

          <Typography
            sx={{
              fontSize: 10.5,

              fontWeight: 700,

              color:
                "#506579",
            }}
          >
            Row Layout
          </Typography>


          {rowType ===
            "kpi" && (

            <Typography
              sx={{
                fontSize: 9,

                color:
                  "#8998a8",
              }}
            >
              Maximum {maxKpiCards} KPI cards available
            </Typography>

          )}

        </Box>


        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              {
                xs:
                  "repeat(2, 1fr)",

                sm:
                  "repeat(3, 1fr)",

                md:
                  "repeat(4, 1fr)",
              },

            gap: 1,
          }}
        >

          {availableLayouts.map(
            (
              layout
            ) => (

              <LayoutPreview
                key={
                  layout.id
                }

                columns={
                  layout.columns
                }

                label={
                  layout.label
                }

                selected={
                  layout.id ===
                  layoutId
                }

                onClick={() =>
                  setLayoutId(
                    layout.id
                  )
                }
              />

            )
          )}

        </Box>


        {/* SUMMARY */}

        {selectedLayout && (

          <Box
            sx={{
              mt: 2,

              p: 1.2,

              border:
                "1px solid #e0e8ee",

              bgcolor:
                "#fff",
            }}
          >

            <Typography
              sx={{
                fontSize:
                  9.5,

                color:
                  "#738497",
              }}
            >
              {mode === "edit"
                ? "Updated row"
                : "New row"}
            </Typography>


            <Typography
              sx={{
                mt: 0.25,

                fontSize: 11,

                fontWeight: 700,

                color:
                  "#344e64",
              }}
            >
              {
                selectedRowType
                  ?.label
              }
              {" · "}
              {
                selectedLayout
                  .label
              }
            </Typography>


            <Typography
              sx={{
                mt: 0.35,

                fontSize: 9.5,

                color:
                  "#8796a5",
              }}
            >
              12-column distribution:{" "}
              {
                selectedLayout
                  .columns
                  .join(
                    " | "
                  )
              }
            </Typography>

          </Box>

        )}

      </DialogContent>


      <DialogActions
        sx={{
          px: 2.2,
          py: 1.2,

          borderTop:
            "1px solid #e1e8ee",

          bgcolor:
            "#fff",
        }}
      >

        <Button
          onClick={
            onClose
          }

          sx={{
            textTransform:
              "none",

            fontSize: 11,
          }}
        >
          Cancel
        </Button>


        <Button
            variant="contained"

            onClick={
              handleSaveRow
            }

            disabled={
              !selectedLayout
            }

            sx={{
              px:
                2,

              textTransform:
                "none",

              fontSize:
                11,

              bgcolor:
                "#0879df",
            }}
          >
            {mode === "edit"
              ? "Apply Row Changes"
              : "Add Row"}
          </Button>

      </DialogActions>

    </Dialog>
  );
}