import React, {
  useEffect,
  useState,
} from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";


const AGGREGATIONS = [
  {
    value: "count",
    label: "Count Records",
  },
  {
    value: "count_values",
    label: "Count Values",
  },
  {
    value: "sum",
    label: "Sum",
  },
  {
    value: "avg",
    label: "Average",
  },
  {
    value: "min",
    label: "Minimum",
  },
  {
    value: "max",
    label: "Maximum",
  },
];


const gentleFieldSx = {

  "& .MuiOutlinedInput-root": {

    height: 42,

    borderRadius:
      "7px",

    bgcolor:
      "#ffffff",

    fontSize:
      "11px",

    color:
      "#52677b",

    boxShadow:
      "none",

    "& fieldset": {
      borderColor:
        "#d8e2eb",
    },

    "&:hover fieldset": {
      borderColor:
        "#c3d0dc",
    },

    "&.Mui-focused fieldset": {
      borderColor:
        "#82a9c8",

      borderWidth:
        "1px",
    },
  },


  "& .MuiInputBase-input": {

    px: 1.4,

    py: 1,

    fontSize:
      "11px",

    fontWeight:
      400,

    color:
      "#52677b",
  },


  "& .MuiSelect-select": {

    display:
      "flex",

    alignItems:
      "center",

    px:
      "13px !important",

    py:
      "9px !important",

    fontSize:
      "11px !important",

    fontWeight:
      "400 !important",

    color:
      "#52677b !important",
  },


  "& .MuiInputLabel-root": {

    fontSize:
      "10.5px",

    fontWeight:
      400,

    color:
      "#8091a2",
  },


  "& .MuiInputLabel-root.Mui-focused": {

    color:
      "#6488a8",
  },


  "& .MuiSvgIcon-root": {

    fontSize:
      17,

    color:
      "#8091a2",
  },
};


const gentleMenuProps = {

  disableScrollLock: true,

  PaperProps: {
    elevation: 4,

    sx: {

      mt: 0.4,

      maxHeight:
        260,

      borderRadius:
        "7px",

      border:
        "1px solid #d8e2eb",

      boxShadow:
        "0 8px 24px rgba(30,55,80,.12)",

      bgcolor:
        "#ffffff",

      "& .MuiMenuItem-root": {

        minHeight:
          "34px",

        px:
          1.4,

        py:
          0.6,

        fontSize:
          "11px",

        fontWeight:
          400,

        color:
          "#52677b",

        "&:hover": {
          bgcolor:
            "#f4f8fb",
        },

        "&.Mui-selected": {

          bgcolor:
            "#edf5fb",

          color:
            "#315f83",
        },

        "&.Mui-selected:hover": {

          bgcolor:
            "#e5f0f8",
        },
      },
    },
  },


  /*
   * Important:
   * do not add another blur layer
   * when a Select menu opens.
   */
  slotProps: {

    backdrop: {

      sx: {

        backdropFilter:
          "none !important",

        WebkitBackdropFilter:
          "none !important",

        backgroundColor:
          "transparent !important",
      },
    },
  },
};


export default function KpiConfigModal({
  open,

  slot,

  tables = [],

  columnsByTable = {},

  loadColumns,

  initialConfig,

  onClose,

  onSave,
}) {

  const [
    form,
    setForm,
  ] = useState({
    title: "",

    tableName: "",

    aggregation: "count",

    valueColumn: "",

    prefix: "",

    suffix: "",

    decimalPlaces: 0,
  });


  useEffect(() => {

  if (!open) {
    return;
  }


  setForm({
    title:
      initialConfig?.title ||
      "",

    tableName:
      initialConfig
        ?.dataSource
        ?.tableName ||
      "",

    aggregation:
      initialConfig
        ?.dataSource
        ?.aggregation ||
      "count",

    valueColumn:
      initialConfig
        ?.dataSource
        ?.valueColumn ||
      "",

    prefix:
      initialConfig
        ?.format
        ?.prefix ||
      "",

    suffix:
      initialConfig
        ?.format
        ?.suffix ||
      "",

    decimalPlaces:
      Number(
        initialConfig
          ?.format
          ?.decimalPlaces ??
        0
      ),
  });

}, [
  open,
  initialConfig,
]);

useEffect(() => {

  if (
    !open ||
    !form.tableName
  ) {
    return;
  }


  loadColumns?.(
    form.tableName
  );

}, [
  open,
  form.tableName,
  loadColumns,
]);

  const handleChange =
    (
      key,
      value
    ) => {

      setForm(
        (prev) => ({
          ...prev,

          [key]:
            value,
        })
      );
    };


  const handleSave =
    () => {

      if (
        !form.title.trim()
      ) {
        alert(
          "KPI title is required"
        );

        return;
      }


      if (
        !form.tableName
      ) {
        alert(
          "Select a data model"
        );

        return;
      }


      const needsValueColumn =
          form.aggregation !==
          "count";


        if (
          needsValueColumn &&
          !form.valueColumn
        ) {
          alert(
            "Select a value column"
          );

          return;
        }


      const component = {
        type: "kpi",

        title:
          form.title.trim(),

        dataSource: {
              tableName:
                form.tableName,

              aggregation:
                form.aggregation,

              /*
              * Preserve the selected column even for
              * Count Records. Count Records simply
              * doesn't need to use it.
              */
              valueColumn:
                form.valueColumn ||
                null,
            },

        format: {
          prefix:
            form.prefix,

          suffix:
            form.suffix,

          decimalPlaces:
            Number(
              form.decimalPlaces ||
              0
            ),
        },
      };


      onSave?.(
        component,
        slot
      );
    };


  const columns =
    columnsByTable[
      form.tableName
    ] || [];


  return (
    <Dialog
      open={
        Boolean(open)
      }

      onClose={
        onClose
      }

      maxWidth={
        false
      }

      BackdropProps={{
        sx: {
          backdropFilter:
            "none !important",

          WebkitBackdropFilter:
            "none !important",

          bgcolor:
            "rgba(17,31,46,.42) !important",
        },
      }}

      PaperProps={{
        sx: {
          width:
            "min(680px,92vw)",

          borderRadius:
            "15px",

          overflow:
            "hidden",

          border:
            "1px solid #cfdae5",

          bgcolor:
            "#f8fbfe",

          boxShadow:
            "0 22px 60px rgba(22,42,61,.22)",
        },
      }}
    >

      {/* HEADER */}

      <Box
        sx={{
          px: 2.4,
          py: 1.8,

          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "flex-start",

          background:
            "linear-gradient(105deg,#187f96 0%,#16849c 45%,#247c98 100%)",

          color:
            "#ffffff",
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize: 18,

              fontWeight: 700,
            }}
          >
            Configure KPI
          </Typography>


          <Typography
            sx={{
              mt: 0.35,

              fontSize: 10.5,

              color:
                "rgba(255,255,255,.86)",
            }}
          >
            Configure the metric displayed in {slot?.slotId || "this dashboard area"}.
          </Typography>

        </Box>


        <Button
          onClick={
            onClose
          }

          sx={{
            minWidth: 32,

            width: 32,

            height: 32,

            borderRadius:
              "50%",

            color:
              "#ffffff",

            fontSize: 18,

            bgcolor:
              "rgba(255,255,255,.10)",

            "&:hover": {
              bgcolor:
                "rgba(255,255,255,.18)",
            },
          }}
        >
          ×
        </Button>

      </Box>


      <DialogContent
        sx={{
          p: 2.4,

          bgcolor:
            "#f8fbfe",
        }}
      >

        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns: {
              xs:
                "1fr",

              sm:
                "repeat(2,minmax(0,1fr))",
            },

            gap: 1.5,
          }}
        >

          <TextField
            label="KPI Title"

            value={
              form.title
            }

            onChange={(e) =>
              handleChange(
                "title",
                e.target.value
              )
            }

            fullWidth

            sx={
              gentleFieldSx
            }
          />


          <TextField
  select

  label="Data Model"

  value={
    form.tableName
  }

  onChange={(e) => {

    const value =
      e.target.value;


    handleChange(
      "tableName",
      value
    );


    handleChange(
      "valueColumn",
      ""
    );
  }}

  SelectProps={{
    MenuProps:
      gentleMenuProps,
  }}

  fullWidth

  sx={
    gentleFieldSx
  }
>

            {tables.map(
              (table) => (

                <MenuItem
                  key={table}

                  value={table}
                >
                  {table}
                </MenuItem>
              )
            )}

          </TextField>


          <TextField
  select

  label="Calculation"

  value={
    form.aggregation
  }

  onChange={(e) => {

  handleChange(
    "aggregation",
    e.target.value
  );

}}

  SelectProps={{
    MenuProps:
      gentleMenuProps,
  }}

  fullWidth

  sx={
    gentleFieldSx
  }
>

            {AGGREGATIONS.map(
              (item) => (

                <MenuItem
                  key={
                    item.value
                  }

                  value={
                    item.value
                  }
                >
                  {item.label}
                </MenuItem>
              )
            )}

          </TextField>


          <TextField
  select

  label="Value Column"

  value={
    form.valueColumn
  }

  disabled={
  !form.tableName
}

  onChange={(e) =>
    handleChange(
      "valueColumn",
      e.target.value
    )
  }

  SelectProps={{
    MenuProps:
      gentleMenuProps,
  }}

  helperText={
  form.aggregation === "count"
    ? "Optional for Count Records"
    : form.aggregation === "count_values"
      ? "Counts non-empty values in the selected column"
      : ""
}

  fullWidth

  sx={{
    ...gentleFieldSx,

    "& .MuiFormHelperText-root": {
      mt: 0.35,
      ml: 0.2,

      fontSize: 9,
      color: "#91a0af",
    },
  }}
>
  {columns.map(
    (column) => (
      <MenuItem
        key={
          column.column_name
        }

        value={
          column.column_name
        }
      >
        {
          column.column_name
        }
      </MenuItem>
    )
  )}
</TextField>


          <TextField
            label="Prefix"

            placeholder="e.g. SAR"

            value={
              form.prefix
            }

            onChange={(e) =>
              handleChange(
                "prefix",
                e.target.value
              )
            }

            fullWidth

            sx={
              gentleFieldSx
            }
          />


          <TextField
            label="Suffix"

            placeholder="e.g. %"

            value={
              form.suffix
            }

            onChange={(e) =>
              handleChange(
                "suffix",
                e.target.value
              )
            }

            fullWidth

            sx={
              gentleFieldSx
            }
          />


          <TextField
            type="number"

            label="Decimal Places"

            value={
              form.decimalPlaces
            }

            inputProps={{
              min: 0,
              max: 6,
            }}

            onChange={(e) =>
              handleChange(
                "decimalPlaces",
                e.target.value
              )
            }

            fullWidth

            sx={
              gentleFieldSx
            }
          />

        </Box>

      </DialogContent>


      <DialogActions
        sx={{
          px: 2.4,

          py: 1.5,

          borderTop:
            "1px solid #dce5ed",

          bgcolor:
            "#f6f9fc",
        }}
      >

        <Button
          onClick={
            onClose
          }

          sx={{
            height: 36,

            px: 1.8,

            color:
              "#53677b",

            bgcolor:
              "#e5e9ed",

            borderRadius:
              "7px",

            fontSize: 11,

            fontWeight: 600,

            textTransform:
              "none",
          }}
        >
          Cancel
        </Button>


        <Button
          onClick={
            handleSave
          }

          variant="contained"

          sx={{
            height: 36,

            px: 2,

            borderRadius:
              "7px",

            bgcolor:
              "#0a74d7",

            fontSize: 11,

            fontWeight: 700,

            textTransform:
              "none",
          }}
        >
          Save KPI
        </Button>

      </DialogActions>

    </Dialog>
  );
}