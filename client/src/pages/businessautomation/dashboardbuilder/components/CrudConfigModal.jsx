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
  FormControlLabel,
  Checkbox,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";


import api from
  "../../../../services/api";

import {
  dialogBackdropSx,
  dialogPaperSx,
  dialogHeaderSx,
  dialogTitleSx,
  dialogSubtitleSx,
  dialogBodySx,
  dialogFooterSx,
  gentleFieldSx,
  gentleMenuProps,
  cancelButtonSx,
  primaryButtonSx,
  closeIconButtonSx,
} from "./dashboardDialogStyles";



export default function CrudConfigModal({
  open,
  slot,

  pages = [],

  initialConfig,

  onClose,
  onSave,
}) {

  const [
  form,
  setForm,
] = useState({
  title: "",
  crudPageId: "",
  displayMode: "table",
  rowLimit: 5,

  visibleColumns: [],

  showActions: true,
});

const [
  availableColumns,
  setAvailableColumns,
] = useState([]);


const [
  loadingColumns,
  setLoadingColumns,
] = useState(false);



useEffect(() => {

  if (!open) {
    return;
  }


  setForm({
    title:
      initialConfig?.title ||
      "",

    crudPageId:
      initialConfig
        ?.dataSource
        ?.crudPageId ||
      "",

    displayMode:
      initialConfig
        ?.display
        ?.mode ||
      "table",

    rowLimit:
      Number(
        initialConfig
          ?.display
          ?.rowLimit ??
        5
      ),

    visibleColumns:
      Array.isArray(
        initialConfig
          ?.display
          ?.visibleColumns
      )
        ? initialConfig
            .display
            .visibleColumns
        : [],

    showActions:
      initialConfig
        ?.display
        ?.showActions !==
      false,
  });

}, [
  open,
  initialConfig,
]);


useEffect(() => {

  const pageId =
    form.crudPageId;


  if (
    !open ||
    !pageId
  ) {

    setAvailableColumns(
      []
    );

    return;
  }


  let cancelled =
    false;


  const loadColumns =
    async () => {

      setLoadingColumns(
        true
      );


      try {

        const res =
          await api.get(
            `/crudpages/${pageId}/columns`
          );


        if (
          cancelled
        ) {
          return;
        }


        const rawColumns =
          res?.data?.columns ||
          [];


        const names =
          rawColumns
            .map(
              (column) =>
                typeof column ===
                "string"
                  ? column
                  : column
                      ?.column_name
            )
            .filter(Boolean);


        setAvailableColumns(
          names
        );


        /*
         * NEW CRUD COMPONENT:
         *
         * If user has not configured visible
         * columns before, initially select all.
         */
        setForm(
          (prev) => {

            if (
              Array.isArray(
                prev.visibleColumns
              ) &&
              prev.visibleColumns
                .length
            ) {

              /*
               * Existing configuration:
               * retain only columns that still exist.
               */
              return {
                ...prev,

                visibleColumns:
                  prev.visibleColumns
                    .filter(
                      (column) =>
                        names.includes(
                          column
                        )
                    ),
              };
            }


            return {
              ...prev,

              visibleColumns:
                names,
            };
          }
        );

      } catch (err) {

        console.error(
          "Failed to load CRUD columns",
          err
        );


        if (
          !cancelled
        ) {

          setAvailableColumns(
            []
          );
        }

      } finally {

        if (
          !cancelled
        ) {

          setLoadingColumns(
            false
          );
        }
      }
    };


  loadColumns();


  return () => {

    cancelled =
      true;
  };

}, [
  open,
  form.crudPageId,
]);


  

  const selectedPage =
    useMemo(
      () =>
        pages.find(
          (page) =>
            String(page?.id) ===
            String(
              form.crudPageId
            )
        ) || null,
      [
        pages,
        form.crudPageId,
      ]
    );


 const handleSave = () => {

  if (
    !form.crudPageId
  ) {

    alert(
      "Select a CRUD page"
    );

    return;
  }


  onSave?.(
    {
      type: "crud",

      title:
        form.title.trim() ||
        selectedPage
          ?.page_name ||
        selectedPage
          ?.form_name ||
        "CRUD App",

      dataSource: {
        crudPageId:
          Number(
            form.crudPageId
          ),
      },

      display: {
        mode:
          form.displayMode,

        rowLimit:
          Number(
            form.rowLimit ||
            5
          ),

        /*
         * Dynamically selected
         * columns for THIS CRUD app.
         */
        visibleColumns:
          Array.isArray(
            form.visibleColumns
          )
            ? form.visibleColumns
            : [],

        /*
         * Whether the dashboard CRUD
         * table should show View/Edit/Delete.
         */
        showActions:
          Boolean(
            form.showActions
          ),
      },
    },

    slot
  );
};

  return (
    <Dialog
      open={Boolean(open)}

      onClose={
        onClose
      }

      maxWidth={false}

      BackdropProps={{
        sx:
          dialogBackdropSx,
      }}

      PaperProps={{
        sx: {
          ...dialogPaperSx,

          width:
            "min(660px,92vw)",
        },
      }}
    >

      {/* HEADER */}

      <Box
        sx={
          dialogHeaderSx
        }
      >

        <Box>

          <Typography
            sx={
              dialogTitleSx
            }
          >
            Configure CRUD App
          </Typography>


          <Typography
            sx={
              dialogSubtitleSx
            }
          >
            Embed an existing CRUD application in {slot?.slotId || "this dashboard area"}.
          </Typography>

        </Box>


        <Button
          onClick={
            onClose
          }

          sx={
            closeIconButtonSx
          }
        >
          ×
        </Button>

      </Box>


      {/* BODY */}

      <DialogContent
        sx={{
          ...dialogBodySx,

          display: "grid",

          gap: 1.4,
        }}
      >

        <TextField
          select

          label="CRUD Page"

          value={
            form.crudPageId
          }

       

          onChange={(e) => {

  const pageId =
    e.target.value;


  const page =
    pages.find(
      (item) =>
        String(
          item?.id
        ) ===
        String(
          pageId
        )
    );


  setForm(
    (prev) => ({
      ...prev,

      crudPageId:
        pageId,

      title:
        page?.page_name ||
        page?.form_name ||
        prev.title ||
        "",

      /*
       * Clear old CRUD page columns.
       * The useEffect will load the new
       * page's columns and select them.
       */
      visibleColumns:
        [],
    })
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

          {pages.map(
            (page) => (

              <MenuItem
                key={
                  page.id
                }

                value={
                  page.id
                }
              >
                {page.page_name ||
                  page.form_name ||
                  `CRUD Page ${page.id}`}
              </MenuItem>
            )
          )}

        </TextField>


        <TextField
          label="Dashboard Title"

          value={
            form.title
          }

          onChange={(e) =>
            setForm(
              (prev) => ({
                ...prev,

                title:
                  e.target.value,
              })
            )
          }

          fullWidth

          sx={
            gentleFieldSx
          }
        />


        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              sm:
                "repeat(2,minmax(0,1fr))",
            },

            gap: 1.4,
          }}
        >

          <TextField
            select

            label="Display Mode"

            value={
              form.displayMode
            }

            onChange={(e) =>
              setForm(
                (prev) => ({
                  ...prev,

                  displayMode:
                    e.target.value,
                })
              )
            }

            SelectProps={{
              MenuProps:
                gentleMenuProps,
            }}

            fullWidth

            sx={
              gentleFieldSx
            }
          >

            <MenuItem value="table">
              Table
            </MenuItem>

            <MenuItem value="tiles">
              Tiles
            </MenuItem>

          </TextField>


          <TextField
            select

            label="Rows to Display"

            value={
              form.rowLimit
            }

            onChange={(e) =>
              setForm(
                (prev) => ({
                  ...prev,

                  rowLimit:
                    Number(
                      e.target.value
                    ),
                })
              )
            }

            SelectProps={{
              MenuProps:
                gentleMenuProps,
            }}

            fullWidth

            sx={
              gentleFieldSx
            }
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

        <Box
  sx={{
    mt: 0.4,

    p: 1.5,

    border:
      "1px solid #dce5ed",

    borderRadius:
      "9px",

    bgcolor:
      "#ffffff",
  }}
>

  <Box
    sx={{
      mb: 1,

      display: "flex",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    }}
  >

    <Typography
      sx={{
        fontSize: 10.5,

        fontWeight: 600,

        color:
          "#53677b",
      }}
    >
      Visible Columns
    </Typography>


    {!!availableColumns.length && (

      <Box
        sx={{
          display: "flex",

          gap: 0.5,
        }}
      >

        <Button
          onClick={() =>
            setForm(
              (prev) => ({
                ...prev,

                visibleColumns:
                  [...availableColumns],
              })
            )
          }

          sx={{
            minWidth: 0,
            p: 0,

            fontSize: 9,

            color:
              "#52718c",

            textTransform:
              "none",
          }}
        >
          Select All
        </Button>


        <Typography
          sx={{
            fontSize: 9,

            color:
              "#b5c0ca",
          }}
        >
          |
        </Typography>


        <Button
          onClick={() =>
            setForm(
              (prev) => ({
                ...prev,

                visibleColumns:
                  [],
              })
            )
          }

          sx={{
            minWidth: 0,
            p: 0,

            fontSize: 9,

            color:
              "#52718c",

            textTransform:
              "none",
          }}
        >
          Clear
        </Button>

      </Box>
    )}

  </Box>


  {loadingColumns ? (

    <Typography
      sx={{
        py: 2,

        fontSize: 10,

        color:
          "#8b9aaa",
      }}
    >
      Loading columns...
    </Typography>

  ) : availableColumns.length ? (

    <Box
      sx={{
        display: "grid",

        gridTemplateColumns: {
          xs:
            "1fr",

          sm:
            "repeat(2,minmax(0,1fr))",

          md:
            "repeat(3,minmax(0,1fr))",
        },

        columnGap: 1.4,

        rowGap: 0.2,
      }}
    >

      {availableColumns.map(
        (column) => {

          const checked =
            form.visibleColumns
              .includes(
                column
              );


          return (

            <FormControlLabel
              key={
                column
              }

              control={
                <Checkbox
                  size="small"

                  checked={
                    checked
                  }

                  onChange={(
                    event
                  ) => {

                    setForm(
                      (prev) => {

                        const current =
                          Array.isArray(
                            prev.visibleColumns
                          )
                            ? prev.visibleColumns
                            : [];


                        return {
                          ...prev,

                          visibleColumns:
                            event
                              .target
                              .checked
                              ? [
                                  ...current,
                                  column,
                                ]
                              : current.filter(
                                  (
                                    item
                                  ) =>
                                    item !==
                                    column
                                ),
                        };
                      }
                    );
                  }}

                  sx={{
                    p: 0.5,

                    "& .MuiSvgIcon-root":
                      {
                        fontSize: 16,
                      },
                  }}
                />
              }

              label={
                column
              }

              sx={{
                m: 0,

                minWidth: 0,

                "& .MuiFormControlLabel-label":
                  {
                    overflow:
                      "hidden",

                    textOverflow:
                      "ellipsis",

                    whiteSpace:
                      "nowrap",

                    fontSize:
                      10,

                    color:
                      "#53677b",
                  },
              }}
            />
          );
        }
      )}

    </Box>

  ) : (

    <Typography
      sx={{
        py: 1,

        fontSize: 10,

        color:
          "#8b9aaa",
      }}
    >
      Select a CRUD page to load its columns.
    </Typography>

  )}

</Box>

<FormControlLabel
  control={
    <Checkbox
      size="small"

      checked={
        Boolean(
          form.showActions
        )
      }

      onChange={(e) =>
        setForm(
          (prev) => ({
            ...prev,

            showActions:
              e.target.checked,
          })
        )
      }
    />
  }

  label="Show View / Edit / Delete actions"

  sx={{
    m: 0,

    "& .MuiFormControlLabel-label":
      {
        fontSize: 10.5,

        color:
          "#53677b",
      },
  }}
/>



        {selectedPage && (

          <Box
            sx={{
              px: 1.3,
              py: 1,

              border:
                "1px solid #dce5ed",

              borderRadius:
                "8px",

              bgcolor:
                "#ffffff",
            }}
          >

            <Typography
              sx={{
                fontSize: 9.5,

                color:
                  "#8b9aaa",
              }}
            >
              Source
            </Typography>


            <Typography
              sx={{
                mt: 0.15,

                fontSize: 10.8,

                fontWeight: 600,

                color:
                  "#40566d",
              }}
            >
              {selectedPage
                ?.table_name ||
                "-"}
            </Typography>

          </Box>
        )}

      </DialogContent>


      {/* FOOTER */}

      <DialogActions
        sx={
          dialogFooterSx
        }
      >

        <Button
          onClick={
            onClose
          }

          sx={
            cancelButtonSx
          }
        >
          Cancel
        </Button>


        <Button
          variant="contained"

          onClick={
            handleSave
          }

          sx={
            primaryButtonSx
          }
        >
          Save CRUD App
        </Button>

      </DialogActions>

    </Dialog>
  );
}