import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";

import OpenInNewOutlinedIcon from
  "@mui/icons-material/OpenInNewOutlined";

import SearchOutlinedIcon from
  "@mui/icons-material/SearchOutlined";

import api from
  "../../../../services/api";

import CrudRecordModal from
  "../../crudpagebuilder/shared/CrudRecordModal";

  import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import VisibilityOutlinedIcon from
  "@mui/icons-material/VisibilityOutlined";

import EditOutlinedIcon from
  "@mui/icons-material/EditOutlined";

import DeleteOutlineOutlinedIcon from
  "@mui/icons-material/DeleteOutlineOutlined";

import MoreVertIcon from
  "@mui/icons-material/MoreVert";

function displayValue(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }


  if (
    typeof value ===
    "object"
  ) {

    try {
      return JSON.stringify(
        value
      );

    } catch {
      return String(
        value
      );
    }
  }


  return String(
    value
  );
}


export default function DashboardCrudComponent({
  component,
}) {

  const pageId =
    component
      ?.dataSource
      ?.crudPageId;


  const displayMode =
    component
      ?.display
      ?.mode ||
    "table";


  const rowLimit =
    Number(
      component
        ?.display
        ?.rowLimit ||
      5
    );


  const [
    pageMeta,
    setPageMeta,
  ] = useState(null);


  const [
    columns,
    setColumns,
  ] = useState([]);

  const [
  actionAnchorEl,
  setActionAnchorEl,
] = useState(null);


const [
  actionRow,
  setActionRow,
] = useState(null);


const showActions =
  component
    ?.display
    ?.showActions !==
  false;

  const [
    rows,
    setRows,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    search,
    setSearch,
  ] = useState("");

  const [
  page,
  setPage,
  ] = useState(0);


  const [
  recordModalOpen,
  setRecordModalOpen,
  ] = useState(false);


  const [
  recordMode,
  setRecordMode,
] = useState(
  "create"
);


const [
  selectedRecord,
  setSelectedRecord,
] = useState({});


  useEffect(() => {
  setPage(0);
}, [
  search,
  rowLimit,
  pageId,
]);

  useEffect(() => {

    if (!pageId) {
      return;
    }


    let cancelled =
      false;


    const load =
      async () => {

        setLoading(true);

        setError("");


        try {

          const [
            metaRes,
            colsRes,
            rowsRes,
          ] =
            await Promise.all([
              api.get(
                `/crudpages/${pageId}`
              ),

              api.get(
                `/crudpages/${pageId}/columns`
              ),

              api.get(
                `/crudpages/${pageId}/records`
              ),
            ]);


          if (
            cancelled
          ) {
            return;
          }


          setPageMeta(
            metaRes?.data ||
            null
          );


          setColumns(
            colsRes
              ?.data
              ?.columns ||
            []
          );


          setRows(
            Array.isArray(
              rowsRes?.data
            )
              ? rowsRes.data
              : []
          );

        } catch (err) {

          if (
            cancelled
          ) {
            return;
          }


          console.error(
            "Failed to load CRUD dashboard component",
            err
          );


          setError(
            "Unable to load CRUD data."
          );

        } finally {

          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };


    load();


    return () => {

      cancelled =
        true;
    };

  }, [
    pageId,
  ]);


  const allColumnNames =
  useMemo(
    () =>
      columns
        .map(
          (column) =>
            typeof column ===
            "string"
              ? column
              : column?.column_name
        )
        .filter(Boolean),
    [
      columns,
    ]
  );


const configuredVisibleColumns =
  Array.isArray(
    component
      ?.display
      ?.visibleColumns
  )
    ? component
        .display
        .visibleColumns
    : [];


const columnNames =
  useMemo(
    () => {

      /*
       * Existing CRUD components created
       * before visibleColumns existed should
       * continue showing all columns.
       */
      if (
        !configuredVisibleColumns
          .length
      ) {

        return allColumnNames;
      }


      /*
       * Preserve the order chosen/saved
       * in the CRUD configuration.
       */
      return configuredVisibleColumns
        .filter(
          (column) =>
            allColumnNames.includes(
              column
            )
        );

    },
    [
      allColumnNames,
      configuredVisibleColumns,
    ]
  );


  const filteredRows =
  useMemo(() => {

    const query =
      search
        .trim()
        .toLowerCase();

    return query
      ? rows.filter(
          (row) =>
            columnNames.some(
              (column) =>
                displayValue(
                  row?.[column]
                )
                  .toLowerCase()
                  .includes(query)
            )
        )
      : rows;

  }, [
    rows,
    search,
    columnNames,
  ]);


  const totalRows =
  filteredRows.length;


const totalPages =
  Math.max(
    1,
    Math.ceil(
      totalRows /
      rowLimit
    )
  );


const safePage =
  Math.max(
    0,
    Math.min(
      page,
      totalPages - 1
    )
  );


  const handleView = (
  row
) => {

  setActionAnchorEl(
    null
  );


  setActionRow(
    null
  );


  setRecordMode(
    "view"
  );


  setSelectedRecord(
    row || {}
  );


  setRecordModalOpen(
    true
  );
};


const handleEdit = (
  row
) => {

  setActionAnchorEl(
    null
  );


  setActionRow(
    null
  );


  setRecordMode(
    "edit"
  );


  setSelectedRecord(
    row || {}
  );


  setRecordModalOpen(
    true
  );
};


const startIndex =
  safePage *
  rowLimit;

  const refreshRecords =
  async () => {

    if (!pageId) {
      return;
    }


    try {

      const response =
        await api.get(
          `/crudpages/${pageId}/records`
        );


      setRows(
        Array.isArray(
          response.data
        )
          ? response.data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to refresh CRUD records",
        error
      );
    }
  };


const pagedRows =
  filteredRows.slice(
    startIndex,
    startIndex +
      rowLimit
  );


  if (
    !pageId
  ) {

    return (
      <Box
        sx={{
          height: "100%",

          display:
            "grid",

          placeItems:
            "center",
        }}
      >
        <Typography
          sx={{
            fontSize: 10,

            color:
              "#94a3b2",
          }}
        >
          CRUD page is not configured.
        </Typography>
      </Box>
    );
  }


  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        minHeight: 220,

        display: "flex",

        flexDirection:
          "column",

        overflow:
          "hidden",
      }}
    >

      {/* TOOLBAR */}

      <Box
        sx={{
          px: 1.2,
          py: 0.75,

          display: "flex",

          alignItems:
            "center",

          gap: 0.8,

          borderBottom:
            "1px solid #e6edf3",
        }}
      >

        <Button
  size="small"

  onClick={() => {

  setRecordMode(
    "create"
  );


  setSelectedRecord(
    {}
  );


  setRecordModalOpen(
    true
  );
}}





  sx={{
    minHeight: 32,

    px: 1.25,

    borderRadius:
      "7px",

    bgcolor:
      "#0a74d7",

    color:
      "#ffffff",

    fontSize: 10,

    fontWeight: 600,

    textTransform:
      "none",

    boxShadow:
      "none",

    "&:hover": {
      bgcolor:
        "#0868c2",

      boxShadow:
        "none",
    },
  }}
>
  + Create New Record
</Button>

        <TextField
          value={
            search
          }

          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }

          placeholder="Search records..."

          size="small"

          InputProps={{
            startAdornment: (
              <SearchOutlinedIcon
                sx={{
                  mr: 0.7,

                  fontSize: 15,

                  color:
                    "#8395a6",
                }}
              />
            ),
          }}

          sx={{
            flex: 1,

            maxWidth: 260,

            "& .MuiOutlinedInput-root":
              {
                height: 32,

                borderRadius:
                  "7px",

                bgcolor:
                  "#ffffff",

                fontSize: 10,
              },

            "& .MuiInputBase-input":
              {
                py: 0.5,
              },
          }}
        />


        <Box
          sx={{
            flex: 1,
          }}
        />


        <Button
          size="small"

          endIcon={
            <OpenInNewOutlinedIcon
              sx={{
                fontSize:
                  "14px !important",
              }}
            />
          }

          onClick={() =>
            window.open(
              `/crudwebpage/${pageId}`,
              "_blank"
            )
          }

          sx={{
            minHeight: 30,

            px: 1,

            border:
              "1px solid #d9e4ee",

            borderRadius:
              "6px",

            color:
              "#52718c",

            fontSize: 9.5,

            fontWeight: 600,

            textTransform:
              "none",

            "&:hover": {
              bgcolor:
                "#f4f8fb",
            },
          }}
        >
          Open App
        </Button>

      </Box>


      {/* CONTENT */}

      <Box
        sx={{
          flex: 1,

          minHeight: 0,

          overflow: "auto",
        }}
      >

        {loading ? (

          <Box
            sx={{
              minHeight: 160,

              display: "grid",

              placeItems:
                "center",
            }}
          >
            <CircularProgress
              size={22}
            />
          </Box>

        ) : error ? (

          <Box
            sx={{
              minHeight: 160,

              display: "grid",

              placeItems:
                "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 10,

                color:
                  "#b42318",
              }}
            >
              {error}
            </Typography>
          </Box>

        ) : displayMode ===
          "tiles" ? (

          <Box
            sx={{
              p: 1,

              display: "grid",

              gridTemplateColumns:
                "repeat(2,minmax(0,1fr))",

              gap: 0.8,
            }}
          >

            {pagedRows.map(
              (
                row,
                rowIndex
              ) => (

                <Box
                  key={
                    row?.id ??
                    rowIndex
                  }

                  sx={{
                    minWidth: 0,

                    p: 1,

                    border:
                      "1px solid #e0e8ef",

                    borderRadius:
                      "7px",

                    bgcolor:
                      "#ffffff",
                  }}
                >

                  {columnNames
                    .slice(
                      0,
                      4
                    )
                    .map(
                      (
                        column,
                        index
                      ) => (

                        <Box
                          key={
                            column
                          }

                          sx={{
                            mb:
                              index ===
                              3
                                ? 0
                                : 0.4,

                            display:
                              "grid",

                            gridTemplateColumns:
                              "82px minmax(0,1fr)",

                            gap: 0.6,
                          }}
                        >

                          <Typography
                            noWrap

                            sx={{
                              fontSize: 8.5,

                              color:
                                "#8a9aaa",
                            }}
                          >
                            {column}
                          </Typography>


                          <Typography
                            noWrap

                            title={
                              displayValue(
                                row?.[
                                  column
                                ]
                              )
                            }

                            sx={{
                              fontSize: 9.5,

                              fontWeight: 500,

                              color:
                                "#40566d",
                            }}
                          >
                            {displayValue(
                              row?.[
                                column
                              ]
                            )}
                          </Typography>

                        </Box>
                      )
                    )}

                </Box>
              )
            )}

          </Box>

        ) : (

          <Box
            component="table"

            sx={{
              width: "100%",

              borderCollapse:
                "collapse",

              tableLayout:
                "fixed",
            }}
          >

            <Box
              component="thead"

              sx={{
                position:
                  "sticky",

                top: 0,

                zIndex: 1,

                bgcolor:
                  "#f5f8fb",
              }}
            >

              <Box
                component="tr"
              >

                {columnNames.map(
                  (column) => (

                    <Box
                      key={
                        column
                      }

                      component="th"

                      sx={{
                        px: 1,

                        py: 0.7,

                        borderBottom:
                          "1px solid #dfe7ee",

                        textAlign:
                          "left",

                        fontSize: 9,

                        fontWeight: 700,

                        color:
                          "#65798c",

                        whiteSpace:
                          "nowrap",

                        overflow:
                          "hidden",

                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {column}
                    </Box>
                  )
                )}

              </Box>

            </Box>


            <Box
              component="tbody"
            >

              {pagedRows.map(
                (
                  row,
                  rowIndex
                ) => (

                  <Box
                    component="tr"

                    key={
                      row?.id ??
                      rowIndex
                    }

                    sx={{
                      "&:hover": {
                        bgcolor:
                          "#fafcfd",
                      },
                    }}
                  >

                    {columnNames.map(
                      (column) => (

                        <Box
                          component="td"

                          key={
                            column
                          }

                          title={
                            displayValue(
                              row?.[
                                column
                              ]
                            )
                          }

                          sx={{
                            px: 1,

                            py: 0.65,

                            borderBottom:
                              "1px solid #edf1f4",

                            fontSize:
                              9.2,

                            color:
                              "#53677b",

                            whiteSpace:
                              "nowrap",

                            overflow:
                              "hidden",

                            textOverflow:
                              "ellipsis",
                          }}
                        >
                          {displayValue(
                            row?.[
                              column
                            ]
                          )}
                        </Box>
                      )
                    )}

                  </Box>
                )
              )}

            </Box>

          </Box>
        )}


        {!loading &&
          !error &&
          !filteredRows.length && (

          <Box
            sx={{
              minHeight: 140,

              display: "grid",

              placeItems:
                "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 10,

                color:
                  "#94a3b2",
              }}
            >
              No records found
            </Typography>
          </Box>

        )}

      </Box>

      <Box
  sx={{
    px: 1.2,
    py: 0.7,

    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",

    gap: 1.2,

    borderTop:
      "1px solid #e6edf3",

    bgcolor:
      "#ffffff",
  }}
>

  <Typography
    sx={{
      fontSize: 9.5,
      color: "#73879a",
    }}
  >
    Rows per page:
    {" "}
    {rowLimit}
  </Typography>


  <Typography
    sx={{
      fontSize: 9.5,
      color: "#73879a",
    }}
  >
    {totalRows === 0
      ? "0–0"
      : `${startIndex + 1}–${Math.min(
          startIndex +
            rowLimit,
          totalRows
        )}`
    }
    {" of "}
    {totalRows}
  </Typography>


  <Button
    disabled={
      safePage <= 0
    }

    onClick={() =>
      setPage(
        (prev) =>
          Math.max(
            0,
            prev - 1
          )
      )
    }

    sx={{
      minWidth: 28,
      width: 28,
      height: 28,
      p: 0,

      color: "#60778d",

      fontSize: 18,
    }}
  >
    ‹
  </Button>


  <Button
    disabled={
      safePage >=
      totalPages - 1
    }

    onClick={() =>
      setPage(
        (prev) =>
          Math.min(
            totalPages - 1,
            prev + 1
          )
      )
    }

    sx={{
      minWidth: 28,
      width: 28,
      height: 28,
      p: 0,

      color: "#60778d",

      fontSize: 18,
    }}
  >
    ›
  </Button>

</Box>

<CrudRecordModal
  open={
    recordModalOpen
  }

  page={
    pageMeta
  }

  mode={
    recordMode
  }

  initialValues={
    selectedRecord
  }

  onClose={() => {

    setRecordModalOpen(
      false
    );


    setSelectedRecord(
      {}
    );
  }}

  onSaved={async () => {

    setRecordModalOpen(
      false
    );


    setSelectedRecord(
      {}
    );


    await refreshRecords();


    setPage(
      0
    );
  }}
/>
    </Box>
  );
}