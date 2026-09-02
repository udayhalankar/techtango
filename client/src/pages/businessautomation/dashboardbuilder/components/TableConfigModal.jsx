import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";


const gentleFieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 42,
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
    color: "#8091a2",
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
      maxHeight: 280,
      borderRadius: "7px",
      border: "1px solid #d8e2eb",
      boxShadow: "0 8px 24px rgba(30,55,80,.12)",

      "& .MuiMenuItem-root": {
        minHeight: 34,
        px: 1.4,
        fontSize: "11px",
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


export default function TableConfigModal({
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
    selectedColumns: [],
    sortColumn: "",
    sortDirection: "asc",
    rowLimit: 10,
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

      selectedColumns:
        Array.isArray(
          initialConfig
            ?.dataSource
            ?.selectedColumns
        )
          ? initialConfig
              .dataSource
              .selectedColumns
          : [],

      sortColumn:
        initialConfig
          ?.dataSource
          ?.sortColumn ||
        "",

      sortDirection:
        initialConfig
          ?.dataSource
          ?.sortDirection ||
        "asc",

      rowLimit:
        Number(
          initialConfig
            ?.dataSource
            ?.rowLimit ??
          10
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


  const columns =
    useMemo(
      () =>
        columnsByTable[
          form.tableName
        ] || [],
      [
        columnsByTable,
        form.tableName,
      ]
    );


  const handleChange =
    (
      key,
      value
    ) => {

      setForm(
        (prev) => ({
          ...prev,
          [key]: value,
        })
      );
    };


  const toggleColumn =
    (columnName) => {

      setForm(
        (prev) => {

          const exists =
            prev
              .selectedColumns
              .includes(
                columnName
              );


          return {
            ...prev,

            selectedColumns:
              exists
                ? prev
                    .selectedColumns
                    .filter(
                      (item) =>
                        item !==
                        columnName
                    )
                : [
                    ...prev
                      .selectedColumns,
                    columnName,
                  ],
          };
        }
      );
    };


  const handleSave =
    () => {

      if (
        !form.title.trim()
      ) {
        alert(
          "Table title is required"
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


      if (
        !form.selectedColumns
          .length
      ) {
        alert(
          "Select at least one column"
        );

        return;
      }


      onSave?.(
        {
          type: "table",

          title:
            form.title.trim(),

          dataSource: {
            tableName:
              form.tableName,

            selectedColumns:
              form.selectedColumns,

            sortColumn:
              form.sortColumn ||
              null,

            sortDirection:
              form.sortDirection,

            rowLimit:
              Number(
                form.rowLimit ||
                10
              ),
          },
        },

        slot
      );
    };


  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
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
            "min(760px,92vw)",

          borderRadius: "15px",
          overflow: "hidden",
          bgcolor: "#f8fbfe",
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

          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",

          background:
            "linear-gradient(105deg,#187f96 0%,#16849c 45%,#247c98 100%)",

          color: "#ffffff",
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Configure Table
          </Typography>

          <Typography
            sx={{
              mt: 0.35,
              fontSize: 10.5,
              color:
                "rgba(255,255,255,.86)",
            }}
          >
            Choose the records and columns to display in {slot?.slotId || "this dashboard area"}.
          </Typography>

        </Box>


        <Button
          onClick={onClose}
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


      <DialogContent
        sx={{
          p: 2.4,
          bgcolor: "#f8fbfe",
        }}
      >

        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              sm:
                "repeat(2,minmax(0,1fr))",
            },

            gap: 1.5,
          }}
        >

          <TextField
            label="Table Title"
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
            sx={gentleFieldSx}
          />


          <TextField
            select
            label="Data Model"
            value={
              form.tableName
            }

            onChange={(e) => {

              handleChange(
                "tableName",
                e.target.value
              );


              handleChange(
                "selectedColumns",
                []
              );


              handleChange(
                "sortColumn",
                ""
              );
            }}

            SelectProps={{
              MenuProps:
                gentleMenuProps,
            }}

            fullWidth
            sx={gentleFieldSx}
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
            label="Sort Column"
            value={
              form.sortColumn
            }

            disabled={
              !form.tableName
            }

            onChange={(e) =>
              handleChange(
                "sortColumn",
                e.target.value
              )
            }

            SelectProps={{
              MenuProps:
                gentleMenuProps,
            }}

            fullWidth
            sx={gentleFieldSx}
          >

            <MenuItem value="">
              None
            </MenuItem>

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
            label="Sort Direction"
            value={
              form.sortDirection
            }

            disabled={
              !form.sortColumn
            }

            onChange={(e) =>
              handleChange(
                "sortDirection",
                e.target.value
              )
            }

            SelectProps={{
              MenuProps:
                gentleMenuProps,
            }}

            fullWidth
            sx={gentleFieldSx}
          >

            <MenuItem value="asc">
              Ascending
            </MenuItem>

            <MenuItem value="desc">
              Descending
            </MenuItem>

          </TextField>


          <TextField
            select
            label="Rows to Display"
            value={
              form.rowLimit
            }

            onChange={(e) =>
              handleChange(
                "rowLimit",
                Number(
                  e.target.value
                )
              )
            }

            SelectProps={{
              MenuProps:
                gentleMenuProps,
            }}

            fullWidth
            sx={gentleFieldSx}
          >

            {[5, 10, 20].map(
              (count) => (

                <MenuItem
                  key={count}
                  value={count}
                >
                  {count}
                </MenuItem>
              )
            )}

          </TextField>

        </Box>


        {/* COLUMN SELECTOR */}

        <Box
          sx={{
            mt: 2,

            p: 1.5,

            borderRadius: "9px",

            border:
              "1px solid #dce5ed",

            bgcolor: "#ffffff",
          }}
        >

          <Typography
            sx={{
              mb: 1,

              fontSize: 10.5,
              fontWeight: 600,
              color: "#53677b",
            }}
          >
            Visible Columns
          </Typography>


          {!form.tableName ? (

            <Typography
              sx={{
                py: 2,
                fontSize: 10,
                color: "#91a0af",
              }}
            >
              Select a data model first.
            </Typography>

          ) : (

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",
                  sm:
                    "repeat(2,minmax(0,1fr))",
                  md:
                    "repeat(3,minmax(0,1fr))",
                },

                columnGap: 1.5,
                rowGap: 0.2,
              }}
            >

              {columns.map(
                (column) => {

                  const name =
                    column.column_name;


                  return (
                    <FormControlLabel
                      key={name}

                      control={
                        <Checkbox
                          size="small"

                          checked={
                            form
                              .selectedColumns
                              .includes(
                                name
                              )
                          }

                          onChange={() =>
                            toggleColumn(
                              name
                            )
                          }

                          sx={{
                            p: 0.55,

                            "& .MuiSvgIcon-root": {
                              fontSize: 16,
                            },
                          }}
                        />
                      }

                      label={name}

                      sx={{
                        m: 0,

                        "& .MuiFormControlLabel-label": {
                          fontSize: 10.5,
                          color: "#52677b",
                        },
                      }}
                    />
                  );
                }
              )}

            </Box>
          )}

        </Box>

      </DialogContent>


      <DialogActions
        sx={{
          px: 2.4,
          py: 1.5,

          borderTop:
            "1px solid #dce5ed",

          bgcolor: "#f6f9fc",
        }}
      >

        <Button
          onClick={onClose}
          sx={{
            height: 36,
            px: 1.8,
            color: "#53677b",
            bgcolor: "#e5e9ed",
            borderRadius: "7px",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          Cancel
        </Button>


        <Button
          onClick={handleSave}
          variant="contained"

          sx={{
            height: 36,
            px: 2,
            borderRadius: "7px",
            bgcolor: "#0a74d7",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          Save Table
        </Button>

      </DialogActions>

    </Dialog>
  );
}