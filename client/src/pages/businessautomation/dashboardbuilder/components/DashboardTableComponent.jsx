import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

import SearchOutlinedIcon from
  "@mui/icons-material/SearchOutlined";

import KeyboardArrowLeftIcon from
  "@mui/icons-material/KeyboardArrowLeft";

import KeyboardArrowRightIcon from
  "@mui/icons-material/KeyboardArrowRight";

import ArrowUpwardIcon from
  "@mui/icons-material/ArrowUpward";

import ArrowDownwardIcon from
  "@mui/icons-material/ArrowDownward";

import api from
  "../../../../services/api";


export default function DashboardTableComponent({
  dashboardId,
  component,
}) {

  const source =
    component?.dataSource ||
    {};


  const pageSize =
    Math.max(
      1,
      Number(
        source?.rowLimit ||
        10
      )
    );


  const [
    rows,
    setRows,
  ] = useState([]);


  const [
    columns,
    setColumns,
  ] = useState([]);


  const [
    totalRows,
    setTotalRows,
  ] = useState(0);


  const [
    page,
    setPage,
  ] = useState(0);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    sortColumn,
    setSortColumn,
  ] = useState(
    source?.sortColumn ||
    ""
  );


  const [
    sortDirection,
    setSortDirection,
  ] = useState(
    source?.sortDirection ||
    "asc"
  );


  const [
    loading,
    setLoading,
  ] = useState(false);


  useEffect(() => {

    setPage(
      0
    );

  }, [
    search,
    sortColumn,
    sortDirection,
    pageSize,
  ]);


  useEffect(() => {

    if (
      !dashboardId ||
      !source?.tableName ||
      !Array.isArray(
        source?.selectedColumns
      ) ||
      !source
        .selectedColumns
        .length
    ) {
      return;
    }


    let cancelled =
      false;


    const load =
      async () => {

        setLoading(
          true
        );


        try {

          const res =
            await api.post(
              `/dashboardbuilder/${dashboardId}/component-table-data`,
              {
                tableName:
                  source.tableName,

                selectedColumns:
                  source.selectedColumns,

                search,

                sortColumn:
                  sortColumn ||
                  source.sortColumn ||
                  "",

                sortDirection,

                page,

                pageSize,
              }
            );


          if (
            cancelled
          ) {
            return;
          }


          setColumns(
            Array.isArray(
              res?.data
                ?.columns
            )
              ? res.data.columns
              : []
          );


          setRows(
            Array.isArray(
              res?.data?.rows
            )
              ? res.data.rows
              : []
          );


          setTotalRows(
            Number(
              res?.data
                ?.totalRows ||
              0
            )
          );

        } catch (error) {

          if (
            cancelled
          ) {
            return;
          }


          console.error(
            "Failed to load dashboard table",
            error
          );


          setRows(
            []
          );


          setTotalRows(
            0
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
    dashboardId,
    source?.tableName,
    source?.selectedColumns,
    source?.sortColumn,
    search,
    sortColumn,
    sortDirection,
    page,
    pageSize,
  ]);


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRows /
        pageSize
      )
    );


  const startRow =
    totalRows === 0
      ? 0
      : page *
          pageSize +
        1;


  const endRow =
    Math.min(
      (
        page + 1
      ) *
        pageSize,
      totalRows
    );


  const handleSort =
    (column) => {

      if (
        sortColumn ===
        column
      ) {

        setSortDirection(
          (prev) =>
            prev ===
            "asc"
              ? "desc"
              : "asc"
        );

        return;
      }


      setSortColumn(
        column
      );


      setSortDirection(
        "asc"
      );
    };


  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        minHeight: 0,

        display: "flex",

        flexDirection:
          "column",
      }}
    >

      {/* SEARCH */}

      <Box
        sx={{
          pb: 0.8,

          display: "flex",

          alignItems:
            "center",
        }}
      >

        <TextField
          size="small"

          value={
            search
          }

          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }

          placeholder=
            "Search records..."

          InputProps={{
            startAdornment: (
              <InputAdornment
                position="start"
              >
                <SearchOutlinedIcon
                  sx={{
                    fontSize: 15,

                    color:
                      "#8799aa",
                  }}
                />
              </InputAdornment>
            ),
          }}

          sx={{
            width: {
              xs: "100%",
              sm: 260,
            },

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

      </Box>


      {/* TABLE */}

      <Box
        sx={{
          flex: 1,

          minHeight: 0,

          overflow: "auto",

          border:
            "1px solid #e1e8ef",

          borderRadius:
            "7px",

          bgcolor:
            "#ffffff",
        }}
      >

        {rows.length ? (

          <Box
            component="table"

            sx={{
              width:
                "100%",

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

                {columns.map(
                  (column) => {

                    const active =
                      sortColumn ===
                      column;


                    return (

                      <Box
                        key={
                          column
                        }

                        component="th"

                        onClick={() =>
                          handleSort(
                            column
                          )
                        }

                        sx={{
                          px: 1,

                          py: 0.75,

                          cursor:
                            "pointer",

                          userSelect:
                            "none",

                          textAlign:
                            "left",

                          borderBottom:
                            "1px solid #e2e9f0",

                          fontSize:
                            9.5,

                          fontWeight:
                            700,

                          color:
                            active
                              ? "#365f80"
                              : "#64798d",

                          whiteSpace:
                            "nowrap",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          "&:hover": {
                            bgcolor:
                              "#edf3f7",
                          },
                        }}
                      >

                        <Box
                          sx={{
                            minWidth: 0,

                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap: 0.35,
                          }}
                        >

                          <Box
                            component="span"

                            sx={{
                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {column}
                          </Box>


                          {active && (
                            sortDirection ===
                            "asc"
                              ? (
                                <ArrowUpwardIcon
                                  sx={{
                                    flex:
                                      "0 0 auto",

                                    fontSize:
                                      11,
                                  }}
                                />
                              )
                              : (
                                <ArrowDownwardIcon
                                  sx={{
                                    flex:
                                      "0 0 auto",

                                    fontSize:
                                      11,
                                  }}
                                />
                              )
                          )}

                        </Box>

                      </Box>
                    );
                  }
                )}

              </Box>

            </Box>


            <Box
              component="tbody"
            >

              {rows.map(
                (
                  row,
                  rowIndex
                ) => (

                  <Box
                    key={
                      rowIndex
                    }

                    component="tr"

                    sx={{
                      "&:hover": {
                        bgcolor:
                          "#fafcfd",
                      },
                    }}
                  >

                    {columns.map(
                      (column) => (

                        <Box
                          key={
                            column
                          }

                          component="td"

                          title={
                            row?.[
                              column
                            ] ??
                            ""
                          }

                          sx={{
                            px: 1,

                            py: 0.7,

                            borderBottom:
                              "1px solid #edf1f4",

                            fontSize:
                              9.5,

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
                          {row?.[
                            column
                          ] ??
                            "-"}
                        </Box>
                      )
                    )}

                  </Box>
                )
              )}

            </Box>

          </Box>

        ) : (

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
                  "#97a6b5",
              }}
            >
              {loading
                ? "Loading..."
                : "No records found"}
            </Typography>
          </Box>
        )}

      </Box>


      {/* PAGING */}

      <Box
        sx={{
          minHeight: 34,

          px: 0.5,
          pt: 0.6,

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "flex-end",

          gap: 0.55,
        }}
      >

        <Typography
          sx={{
            mr: 0.35,

            fontSize: 9,

            color:
              "#73879a",
          }}
        >
          {startRow}
          –
          {endRow}
          {" of "}
          {totalRows}
        </Typography>


        <IconButton
          size="small"

          disabled={
            page <= 0
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
            width: 25,
            height: 25,

            color:
              "#60778d",
          }}
        >
          <KeyboardArrowLeftIcon
            sx={{
              fontSize: 16,
            }}
          />
        </IconButton>


        <IconButton
          size="small"

          disabled={
            page >=
            totalPages - 1
          }

          onClick={() =>
            setPage(
              (prev) =>
                Math.min(
                  totalPages -
                    1,
                  prev + 1
                )
            )
          }

          sx={{
            width: 25,
            height: 25,

            color:
              "#60778d",
          }}
        >
          <KeyboardArrowRightIcon
            sx={{
              fontSize: 16,
            }}
          />
        </IconButton>

      </Box>

    </Box>
  );
}