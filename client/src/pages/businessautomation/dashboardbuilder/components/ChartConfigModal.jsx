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


const CHART_TYPES = [
  {
    value: "Bar",
    label: "Bar",
  },
  {
    value: "H. Bar",
    label: "Horizontal Bar",
  },
  {
    value: "Line",
    label: "Line",
  },
  {
    value: "Pie",
    label: "Pie",
  },
  {
    value: "Doughnut",
    label: "Doughnut",
  },
];


const AGGREGATIONS = [
  {
    value: "actual",
    label: "Actual Values",
  },
  {
    value: "count",
    label: "Count",
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

    borderRadius: "7px",

    bgcolor: "#ffffff",

    fontSize: "11px",

    color: "#52677b",

    "& fieldset": {
      borderColor: "#d8e2eb",
    },

    "&:hover fieldset": {
      borderColor: "#c3d0dc",
    },

    "&.Mui-focused fieldset": {
      borderColor: "#82a9c8",

      borderWidth: "1px",
    },
  },

  "& .MuiInputBase-input": {
    px: 1.4,

    py: 1,

    fontSize: "11px",

    fontWeight: 400,

    color: "#52677b",
  },

  "& .MuiSelect-select": {
    display: "flex",

    alignItems: "center",

    px: "13px !important",

    py: "9px !important",

    fontSize: "11px !important",

    fontWeight: "400 !important",

    color: "#52677b !important",
  },

  "& .MuiInputLabel-root": {
    fontSize: "10.5px",

    fontWeight: 400,

    color: "#8091a2",
  },

  "& .MuiInputLabel-root.Mui-focused": {
    color: "#6488a8",
  },

  "& .MuiSvgIcon-root": {
    fontSize: 17,

    color: "#8091a2",
  },
};


const gentleMenuProps = {
  disableScrollLock: true,

  PaperProps: {
    sx: {
      mt: 0.4,

      maxHeight: 270,

      borderRadius: "7px",

      border:
        "1px solid #d8e2eb",

      boxShadow:
        "0 8px 24px rgba(30,55,80,.12)",

      "& .MuiMenuItem-root": {
        minHeight: "34px",

        px: 1.4,

        py: 0.6,

        fontSize: "11px",

        fontWeight: 400,

        color: "#52677b",

        "&:hover": {
          bgcolor: "#f4f8fb",
        },

        "&.Mui-selected": {
          bgcolor: "#edf5fb",

          color: "#315f83",
        },
      },
    },
  },
};


export default function ChartConfigModal({
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

    chartType: "Bar",

    xAxis: "",

    yAxis: "",

    aggregation: "actual",
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

      chartType:
        initialConfig
          ?.chartType ||
        "Bar",

      xAxis:
        initialConfig
          ?.dataSource
          ?.xAxis ||
        "",

      yAxis:
        initialConfig
          ?.dataSource
          ?.yAxis ||
        "",

      aggregation:
        initialConfig
          ?.dataSource
          ?.aggregation ||
        "actual",
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


  const setValue =
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


  const columns =
    columnsByTable[
      form.tableName
    ] || [];


  const handleSave =
    () => {

      if (
        !form.title.trim()
      ) {
        alert(
          "Chart title is required"
        );

        return;
      }


      if (!form.tableName) {
        alert(
          "Select a data model"
        );

        return;
      }


      if (!form.xAxis) {
        alert(
          "Select an X-Axis column"
        );

        return;
      }


      if (!form.yAxis) {
        alert(
          "Select a Y-Axis column"
        );

        return;
      }


      onSave?.(
        {
          type:
            "chart",

          title:
            form.title.trim(),

          chartType:
            form.chartType,

          dataSource: {
            tableName:
              form.tableName,

            xAxis:
              form.xAxis,

            yAxis:
              form.yAxis,

            aggregation:
              form.aggregation,
          },
        },

        slot
      );
    };


  const selectProps = {
    MenuProps:
      gentleMenuProps,
  };


  return (
    <Dialog
      open={
        Boolean(open)
      }

      onClose={
        onClose
      }

      maxWidth={false}

      BackdropProps={{
        sx: {
          backdropFilter:
            "none !important",

          WebkitBackdropFilter:
            "none !important",

          backgroundColor:
            "rgba(17,31,46,.42) !important",
        },
      }}

      PaperProps={{
        sx: {
          width:
            "min(720px,92vw)",

          borderRadius:
            "15px",

          overflow:
            "hidden",

          bgcolor:
            "#f8fbfe",

          border:
            "1px solid #cfdae5",

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
            Configure Chart
          </Typography>


          <Typography
            sx={{
              mt: 0.35,

              fontSize: 10.5,

              color:
                "rgba(255,255,255,.86)",
            }}
          >
            Select the data source and visualization for {slot?.slotId || "this dashboard area"}.
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

            borderRadius: "50%",

            color: "#ffffff",

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


      {/* BODY */}

      <DialogContent
        sx={{
          p: 2.4,

          bgcolor:
            "#f8fbfe",
        }}
      >

        <Box
          sx={{
            display: "grid",

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
            label="Chart Title"

            value={
              form.title
            }

            onChange={(e) =>
              setValue(
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

            label="Chart Type"

            value={
              form.chartType
            }

            onChange={(e) =>
              setValue(
                "chartType",
                e.target.value
              )
            }

            SelectProps={
              selectProps
            }

            fullWidth

            sx={
              gentleFieldSx
            }
          >

            {CHART_TYPES.map(
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

            label="Data Model"

            value={
              form.tableName
            }

            onChange={(e) => {

              setValue(
                "tableName",
                e.target.value
              );


              setValue(
                "xAxis",
                ""
              );


              setValue(
                "yAxis",
                ""
              );
            }}

            SelectProps={
              selectProps
            }

            fullWidth

            sx={
              gentleFieldSx
            }
          >

            {tables.map(
              (table) => (

                <MenuItem
                  key={
                    table
                  }

                  value={
                    table
                  }
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

            onChange={(e) =>
              setValue(
                "aggregation",
                e.target.value
              )
            }

            SelectProps={
              selectProps
            }

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

            label="X-Axis"

            value={
              form.xAxis
            }

            disabled={
              !form.tableName
            }

            onChange={(e) =>
              setValue(
                "xAxis",
                e.target.value
              )
            }

            SelectProps={
              selectProps
            }

            fullWidth

            sx={
              gentleFieldSx
            }
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
            select

            label="Y-Axis"

            value={
              form.yAxis
            }

            disabled={
              !form.tableName
            }

            onChange={(e) =>
              setValue(
                "yAxis",
                e.target.value
              )
            }

            SelectProps={
              selectProps
            }

            fullWidth

            sx={
              gentleFieldSx
            }
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
          Save Chart
        </Button>

      </DialogActions>

    </Dialog>
  );
}