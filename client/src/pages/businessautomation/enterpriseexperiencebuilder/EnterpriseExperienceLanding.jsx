import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import {
  useNavigate,
} from "react-router-dom";

import OpenInNewOutlinedIcon from
  "@mui/icons-material/OpenInNewOutlined";

import ModuleTileGrid from
  "../../../components/ModuleTileGrid";

import CreateExperienceModal from
  "./components/CreateExperienceModal";

import {
  createEnterpriseExperience,
  deleteEnterpriseExperience,
  listEnterpriseExperiences,
} from
  "./api/enterpriseExperienceApi";


/* ============================================================================
   DATE
============================================================================ */

function formatDate(
  value
) {

  if (!value) {
    return "-";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(
      value
    );
  }


  return date
    .toLocaleDateString(
      "en-GB",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      }
    );
}


/* ============================================================================
   TILE ROW
============================================================================ */

function TileRow({
  label,
  value,
}) {

  return (
    <Box
      sx={{
        display:
          "grid",

        gridTemplateColumns:
          "72px minmax(0,1fr)",

        columnGap:
          0.5,

        alignItems:
          "center",

        height:
          18,

        minWidth:
          0,
      }}
    >

      <Typography
        noWrap

        sx={{
          fontSize:
            10,

          color:
            "#738496",

          fontWeight:
            500,
        }}
      >
        {label}
      </Typography>


      <Typography
        noWrap

        title={
          String(
            value ??
            "-"
          )
        }

        sx={{
          minWidth:
            0,

          overflow:
            "hidden",

          textOverflow:
            "ellipsis",

          whiteSpace:
            "nowrap",

          fontSize:
            10.5,

          color:
            "#33485d",

          fontWeight:
            600,
        }}
      >
        {value ?? "-"}
      </Typography>

    </Box>
  );
}


/* ============================================================================
   LANDING PAGE
============================================================================ */

export default function EnterpriseExperienceLanding() {

  const navigate =
    useNavigate();


  const [
    experiences,
    setExperiences,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    loadError,
    setLoadError,
  ] =
    useState("");


  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);


  const [
    creating,
    setCreating,
  ] =
    useState(false);


  /* =========================================================================
     LOAD LANDING PAGE

     Backend applies:

     builder_type =
       enterpriseexperiencebuilder
  ========================================================================= */

  const loadExperiences =
    async () => {

      setLoading(
        true
      );

      setLoadError(
        ""
      );


      try {

        const rows =
          await listEnterpriseExperiences();


        setExperiences(
          rows
        );

      } catch (err) {

        console.error(
          "Failed to load Enterprise Experiences",
          err
        );


        setExperiences(
          []
        );


        setLoadError(
          err?.response
            ?.data
            ?.error ||
          "Unable to load Enterprise Experiences."
        );

      } finally {

        setLoading(
          false
        );
      }
    };


  useEffect(() => {

    loadExperiences();

  }, []);


  /* =========================================================================
     TILES
  ========================================================================= */

  const tiles =
    useMemo(
      () =>
        experiences.map(
          (
            record
          ) => {

            const pageUrl =
              record?.page_url ||
              `/enterpriseexperience/${record.id}`;


            return {
              id:
                record.id,

              label:
                record.page_name ||
                "Untitled Enterprise Experience",

              desc:
                record.description ||
                "",

              searchText: [
                record.page_name,
                record.description,
                record.status,
                record.id,
              ]
                .filter(Boolean)
                .join(" "),

              record,

              pageUrl,

              onClick:
                () => {

                  navigate(
                    pageUrl
                  );
                },
            };
          }
        ),

      [
        experiences,
        navigate,
      ]
    );


  /* =========================================================================
     CREATE
  ========================================================================= */

  const handleCreate =
    async (
      draftExperience
    ) => {

      if (
        creating
      ) {
        return;
      }


      setCreating(
        true
      );


      try {

        /*
         * SAME persistence function used
         * by Enterprise Experience Builder.
         */
        const created =
          await createEnterpriseExperience(
            draftExperience
          );


        const newId =
          created?.id;


        if (
          !newId
        ) {

          throw new Error(
            "Enterprise Experience was created but no id was returned."
          );
        }


        setCreateOpen(
          false
        );


        /*
         * Backend is authoritative for page_url.
         */
        const targetUrl =
          created
            ?.page_url ||
          `/enterpriseexperience/${newId}`;


        navigate(
          targetUrl
        );

      } catch (err) {

        console.error(
          "Failed to create Enterprise Experience",
          err
        );


        window.alert(
          err?.response
            ?.data
            ?.error ||
          err?.message ||
          "Failed to create Enterprise Experience."
        );

      } finally {

        setCreating(
          false
        );
      }
    };


  /* =========================================================================
     DELETE
  ========================================================================= */

  const handleDelete =
    async (
      record
    ) => {

      if (
        !record?.id
      ) {
        return;
      }


      const confirmed =
        window.confirm(
          `Delete "${
            record.page_name ||
            "this Enterprise Experience"
          }"?`
        );


      if (
        !confirmed
      ) {
        return;
      }


      try {

        await deleteEnterpriseExperience(
          record.id
        );


        setExperiences(
          (
            current
          ) =>
            current.filter(
              (item) =>
                String(
                  item.id
                ) !==
                String(
                  record.id
                )
            )
        );

      } catch (err) {

        console.error(
          "Failed to delete Enterprise Experience",
          err
        );


        window.alert(
          err?.response
            ?.data
            ?.error ||
          "Failed to delete Enterprise Experience."
        );
      }
    };


  /* =========================================================================
     RENDER
  ========================================================================= */

  if (
    loading
  ) {

    return (
      <>
        <ModuleTileGrid
          title="Enterprise Experience Builder"
          subtitle="Create and manage enterprise experience pages, portals and digital workspaces."
          tiles={[]}
          searchEnabled={false}
          primaryAction={{
            label:
              "Create New Experience",

            onClick:
              () =>
                setCreateOpen(
                  true
                ),
          }}
        >
          <Box
            sx={{
              minHeight: 250,

              display: "grid",

              placeItems: "center",
            }}
          >
            <CircularProgress
              size={22}
            />
          </Box>
        </ModuleTileGrid>

        <CreateExperienceModal
          open={createOpen}
          saving={creating}
          onClose={() =>
            setCreateOpen(false)
          }
          onSave={handleCreate}
        />
      </>
    );
  }


  return (
    <>

      <ModuleTileGrid
        title=
          "Enterprise Experience Builder"

        subtitle=
          "Create and manage enterprise experience pages, portals and digital workspaces."

        tiles={
          tiles
        }

        searchPlaceholder=
          "Search enterprise experiences"

        primaryAction={{
          label:
            "Create New Experience",

          onClick:
            () =>
              setCreateOpen(
                true
              ),
        }}

        showDefaultFooter={
          false
        }

        renderTileContent={(tile) => {

          const record =
            tile.record;


          if (
            !record
          ) {
            return null;
          }


          const modifiedDate =
            record.date_modified ||
            record.date_created;


          return (
            <>

              {/* =========================================================
                  TITLE + STATUS
              ========================================================= */}

              <Stack
                direction=
                  "row"

                alignItems=
                  "flex-start"

                justifyContent=
                  "space-between"

                spacing={
                  1
                }
              >

                <Typography
                  noWrap

                  title={
                    record.page_name ||
                    ""
                  }

                  sx={{
                    minWidth:
                      0,

                    flex:
                      1,

                    fontSize:
                      14,

                    fontWeight:
                      700,

                    lineHeight:
                      "20px",

                    color:
                      "#172b4d",

                    overflow:
                      "hidden",

                    textOverflow:
                      "ellipsis",

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {record.page_name ||
                    "Untitled Enterprise Experience"}
                </Typography>


                <Box
                  sx={{
                    flex:
                      "0 0 auto",

                    px:
                      0.9,

                    py:
                      0.25,

                    borderRadius:
                      "999px",

                    bgcolor:
                      String(
                        record.status ||
                        ""
                      )
                        .toLowerCase() ===
                      "active"
                        ? "#eaf7f0"
                        : "#eef3f7",

                    color:
                      String(
                        record.status ||
                        ""
                      )
                        .toLowerCase() ===
                      "active"
                        ? "#17875b"
                        : "#52677a",

                    fontSize:
                      9.5,

                    fontWeight:
                      700,

                    lineHeight:
                      1.3,
                  }}
                >
                  {record.status ||
                    "Active"}
                </Box>

              </Stack>


              {/* =========================================================
                  DESCRIPTION
              ========================================================= */}

              <Typography
                title={
                  record.description ||
                  ""
                }

                sx={{
                  mt:
                    0.35,

                  minHeight:
                    26,

                  maxHeight:
                    26,

                  fontSize:
                    9.8,

                  fontWeight:
                    400,

                  lineHeight:
                    "13px",

                  color:
                    "#8a98a8",

                  display:
                    "-webkit-box",

                  WebkitBoxOrient:
                    "vertical",

                  WebkitLineClamp:
                    2,

                  overflow:
                    "hidden",
                }}
              >
                {record.description ||
                  ""}
              </Typography>


              <Box
                sx={{
                  flexGrow:
                    1,
                }}
              />


              {/* =========================================================
                  DETAILS + ACTIONS
              ========================================================= */}

              <Box
                sx={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "minmax(0,1fr) auto",

                  columnGap:
                    1,

                  alignItems:
                    "end",

                  width:
                    "100%",

                  minWidth:
                    0,
                }}
              >

                <Box
                  sx={{
                    display:
                      "grid",

                    rowGap:
                      "1px",

                    minWidth:
                      0,
                  }}
                >

                  <TileRow
                    label=
                      "Page ID"

                    value={
                      record.id
                    }
                  />


                  <TileRow
                    label=
                      "Type"

                    value=
                      "Enterprise Experience"
                  />


                  <TileRow
                    label=
                      "Modified"

                    value={
                      formatDate(
                        modifiedDate
                      )
                    }
                  />

                </Box>


                <Stack
                  direction=
                    "row"

                  spacing={
                    0.5
                  }

                  alignItems=
                    "flex-end"
                >

                  {/* OPEN */}

                  <Button
                    size=
                      "small"

                    onClick={(event) => {

                      event.stopPropagation();


                      navigate(
                        tile.pageUrl
                      );
                    }}

                    startIcon={
                      <OpenInNewOutlinedIcon
                        sx={{
                          fontSize:
                            "14px !important",
                        }}
                      />
                    }

                    sx={{
                      height:
                        27,

                      minHeight:
                        27,

                      px:
                        0.9,

                      border:
                        "1px solid #b8cce1",

                      borderRadius:
                        "3px",

                      color:
                        "#0a6ed1",

                      bgcolor:
                        "#ffffff",

                      fontSize:
                        10,

                      textTransform:
                        "none",

                      "&:hover": {
                        bgcolor:
                          "#edf5fc",
                      },
                    }}
                  >
                    Open
                  </Button>


                  {/* DELETE */}

                  <Button
                    size=
                      "small"

                    onClick={(event) => {

                      event.stopPropagation();


                      handleDelete(
                        record
                      );
                    }}

                    sx={{
                      height:
                        27,

                      minHeight:
                        27,

                      px:
                        0.9,

                      border:
                        "1px solid #f0c0bc",

                      borderRadius:
                        "3px",

                      color:
                        "#b42318",

                      bgcolor:
                        "#ffffff",

                      fontSize:
                        10,

                      textTransform:
                        "none",

                      "&:hover": {
                        bgcolor:
                          "#fdf2f1",
                      },
                    }}
                  >
                    Delete
                  </Button>

                </Stack>

              </Box>

            </>
          );
        }}

      >

        {/* ===============================================================
            ModuleTileGrid children are only used for exceptional states.
        =============================================================== */}

        {loading ? (

          <Box
            sx={{
              minHeight:
                250,

              display:
                "grid",

              placeItems:
                "center",
            }}
          >

            <Stack
              alignItems=
                "center"

              spacing={
                1
              }
            >

              <CircularProgress
                size={
                  22
                }
              />


              <Typography
                sx={{
                  fontSize:
                    11,

                  color:
                    "#738496",
                }}
              >
                Loading Enterprise Experiences...
              </Typography>

            </Stack>

          </Box>

        ) : loadError ? (

          <Box
            sx={{
              minHeight:
                220,

              display:
                "grid",

              placeItems:
                "center",
            }}
          >

            <Box
              sx={{
                textAlign:
                  "center",
              }}
            >

              <Typography
                sx={{
                  fontSize:
                    12,

                  fontWeight:
                    700,

                  color:
                    "#b42318",
                }}
              >
                {loadError}
              </Typography>


              <Button
                size=
                  "small"

                variant=
                  "outlined"

                onClick={
                  loadExperiences
                }

                sx={{
                  mt:
                    1.2,

                  textTransform:
                    "none",

                  borderRadius:
                    "3px",
                }}
              >
                Retry
              </Button>

            </Box>

          </Box>

        ) : experiences.length ===
          0 ? (

          <Box
            sx={{
              minHeight:
                220,

              display:
                "grid",

              placeItems:
                "center",

              textAlign:
                "center",
            }}
          >

            <Box>

              <Typography
                sx={{
                  fontSize:
                    13,

                  fontWeight:
                    700,

                  color:
                    "#33485d",
                }}
              >
                No Enterprise Experiences yet
              </Typography>


              <Typography
                sx={{
                  mt:
                    0.5,

                  fontSize:
                    10.5,

                  color:
                    "#8292a2",
                }}
              >
                Create your first Enterprise Experience to get started.
              </Typography>

            </Box>

          </Box>

        ) : null}

      </ModuleTileGrid>


      {/* =================================================================
          CREATE MODAL
      ================================================================= */}

      <CreateExperienceModal
        open={
          createOpen
        }

        saving={
          creating
        }

        onClose={
          () =>
            setCreateOpen(
              false
            )
        }

        onSave={
          handleCreate
        }
      />

    </>
  );
}