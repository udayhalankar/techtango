import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Box,
  Button,
  Typography,
} from "@mui/material";

import SaveOutlinedIcon from
  "@mui/icons-material/SaveOutlined";

import SettingsOutlinedIcon from
  "@mui/icons-material/SettingsOutlined";

import CreateExperienceModal from
  "./components/CreateExperienceModal";

import WebOutlinedIcon from
  "@mui/icons-material/WebOutlined";

import ExperienceCanvas from
  "./components/ExperienceCanvas";

import useExperienceComponentLayer from
  "./components/useExperienceComponentLayer";

import ExperienceSettingsForm, {
  createInitialExperience,
} from
  "./components/ExperienceSettingsForm";

import {
  createEnterpriseExperience,
  getEnterpriseExperience,
  saveEnterpriseExperience,
} from
  "./api/enterpriseExperienceApi";


/* ============================================================================
   MAIN BUILDER
============================================================================ */

export default function EnterpriseExperienceBuilder() {

  const navigate =
    useNavigate();


  const {
    id:
      routeExperienceId,
  } =
    useParams();


  const [
    loadingExperience,
    setLoadingExperience,
  ] =
    useState(
      Boolean(
        routeExperienceId
      )
    );


  const [
    savingExperience,
    setSavingExperience,
  ] =
    useState(false);


  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    experience,
    setExperience,
  ] =
    useState(
      createInitialExperience
    );


  const [
  settingsOpen,
  setSettingsOpen,
] =
  useState(false);

      /* =========================================================================
     LOAD SAVED ENTERPRISE EXPERIENCE
  ========================================================================= */

  useEffect(() => {

    let cancelled =
      false;


    const loadExperience =
      async () => {

        /*
         * /enterpriseexperiencebuilder
         *
         * = new unsaved experience.
         */
        if (
          !routeExperienceId
        ) {

          setLoadingExperience(
            false
          );

          setLoadError(
            ""
          );

          return;
        }


        setLoadingExperience(
          true
        );

        setLoadError(
          ""
        );


        try {

          const record =
            await getEnterpriseExperience(
              routeExperienceId
            );


          if (
            cancelled
          ) {
            return;
          }


          const savedLayout =
            record?.layout &&
            typeof record.layout ===
              "object"
              ? record.layout
              : {};


          /*
           * Relational columns are authoritative
           * for page name / description.
           *
           * layout JSON is authoritative for the
           * page design.
           */
          const loadedExperience = {
            ...createInitialExperience(),

            ...savedLayout,

            id:
              record?.id,

            name:
              record?.page_name ||
              savedLayout?.name ||
              "Enterprise Experience",

            description:
              record?.description ??
              savedLayout?.description ??
              "",

            page: {
              ...createInitialExperience()
                .page,

              ...(
                savedLayout?.page ||
                {}
              ),
            },

            shell: {
              ...createInitialExperience()
                .shell,

              ...(
                savedLayout?.shell ||
                {}
              ),

              leftSidebar: {
                ...createInitialExperience()
                  .shell
                  .leftSidebar,

                ...(
                  savedLayout
                    ?.shell
                    ?.leftSidebar ||
                  {}
                ),
              },

              rightSidebar: {
                ...createInitialExperience()
                  .shell
                  .rightSidebar,

                ...(
                  savedLayout
                    ?.shell
                    ?.rightSidebar ||
                  {}
                ),
              },
            },

            hero: {
              ...createInitialExperience()
                .hero,

              ...(
                savedLayout?.hero ||
                {}
              ),

              config: {
                ...createInitialExperience()
                  .hero
                  .config,

                ...(
                  savedLayout
                    ?.hero
                    ?.config ||
                  {}
                ),
              },
            },

            rows:
              Array.isArray(
                savedLayout?.rows
              )
                ? savedLayout.rows
                : [],

            components:
              savedLayout
                ?.components &&
              typeof savedLayout
                .components ===
                "object"
                ? savedLayout.components
                : {},
          };


          setExperience(
            loadedExperience
          );

        } catch (err) {

          console.error(
            "Failed to load Enterprise Experience",
            err
          );


          if (
            cancelled
          ) {
            return;
          }


          setLoadError(
            err?.response
              ?.data
              ?.error ||
            "Unable to load Enterprise Experience."
          );

        } finally {

          if (
            !cancelled
          ) {

            setLoadingExperience(
              false
            );
          }
        }
      };


    loadExperience();


    return () => {

      cancelled =
        true;
    };

  }, [
    routeExperienceId,
  ]);

  const rowsCount =
    experience
      ?.rows
      ?.length ||
    0;


  const componentCount =
    useMemo(
      () =>
        Object.keys(
          experience
            ?.components ||
          {}
        ).length,

      [
        experience
          ?.components,
      ]
    );

    const [
      activeComponentSlot,
      setActiveComponentSlot,
    ] = useState(null);


    const [
      addComponentOpen,
      setAddComponentOpen,
    ] = useState(false);

  /* =========================================================================
     COMPONENT PLACEHOLDER

     NEXT STEP:
     Connect this to the reusable AddComponentModal and
     DashboardComponentRenderer.
  ========================================================================= */

  const handleAddComponent =
  (
    slot
  ) => {

    setActiveComponentSlot(
      slot
    );


    setAddComponentOpen(
      true
    );
  };


  const {
  renderComponent,
  modals:
    componentModals,
} =
  useExperienceComponentLayer({
    experience,

    onExperienceChange:
      setExperience,

    activeSlot:
      activeComponentSlot,

    addComponentOpen,

    onCloseAddComponent:
      setAddComponentOpen,

    onSetActiveSlot:
      setActiveComponentSlot,
  });


  /* =========================================================================
     TEMP SAVE

     Persistence API will be connected after the page behavior is stable.
  ========================================================================= */

    /* =========================================================================
     SAVE

     First save:
       POST -> create -> navigate to canonical URL

     Later saves:
       PUT -> update same record
  ========================================================================= */

  const handleSave =
    async () => {

      if (
        savingExperience
      ) {
        return;
      }


      const experienceName =
        String(
          experience?.name ||
          ""
        ).trim();


      if (
        !experienceName
      ) {

        window.alert(
          "Please enter an Experience Name."
        );

        return;
      }


      setSavingExperience(
        true
      );


      try {

        /*
         * Existing saved experience.
         */
        if (
          experience?.id
        ) {

          const savedRecord =
            await saveEnterpriseExperience(
              experience.id,
              experience
            );


          /*
           * Keep DB authoritative metadata synchronized
           * into local state.
           */
          setExperience(
            (
              current
            ) => ({
              ...current,

              id:
                savedRecord?.id ||
                current.id,

              name:
                savedRecord
                  ?.page_name ||
                current.name,

              description:
                savedRecord
                  ?.description ??
                current.description,
            })
          );


          console.log(
            "ENTERPRISE EXPERIENCE UPDATED",
            savedRecord
          );


          return;
        }


        /*
         * First save.
         */
        const createdRecord =
          await createEnterpriseExperience(
            experience
          );


        const newId =
          createdRecord?.id;


        if (
          !newId
        ) {

          throw new Error(
            "Create succeeded but no Enterprise Experience id was returned."
          );
        }


        /*
         * Keep the DB identity in current state before
         * changing route.
         */
        setExperience(
          (
            current
          ) => ({
            ...current,

            id:
              newId,

            name:
              createdRecord
                ?.page_name ||
              current.name,

            description:
              createdRecord
                ?.description ??
              current.description,
          })
        );


        /*
         * Backend creates:
         *
         * /enterpriseexperience/:id
         *
         * Prefer returned page_url. Fall back to
         * canonical route.
         */
        const targetUrl =
          createdRecord
            ?.page_url ||
          `/enterpriseexperience/${newId}`;


        navigate(
          targetUrl,
          {
            replace:
              true,
          }
        );


        console.log(
          "ENTERPRISE EXPERIENCE CREATED",
          createdRecord
        );

      } catch (err) {

        console.error(
          "Failed to save Enterprise Experience",
          err
        );


        window.alert(
          err?.response
            ?.data
            ?.error ||
          err?.message ||
          "Failed to save Enterprise Experience."
        );

      } finally {

        setSavingExperience(
          false
        );
      }
    };


      if (
    loadingExperience
  ) {

    return (
      <Box
        sx={{
          minHeight:
            "calc(100vh - 64px)",

          display:
            "grid",

          placeItems:
            "center",

          bgcolor:
            "#eef3f6",
        }}
      >

        <Typography
          sx={{
            fontSize:
              11,

            fontWeight:
              600,

            color:
              "#60778a",
          }}
        >
          Loading Enterprise Experience...
        </Typography>

      </Box>
    );
  }


  if (
    loadError
  ) {

    return (
      <Box
        sx={{
          minHeight:
            "calc(100vh - 64px)",

          display:
            "grid",

          placeItems:
            "center",

          bgcolor:
            "#eef3f6",
        }}
      >

        <Box
          sx={{
            p: 2,

            bgcolor:
              "#fff",

            border:
              "1px solid #dce5eb",

            borderRadius:
              "3px",

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
                "#344d62",
            }}
          >
            Enterprise Experience could not be loaded
          </Typography>


          <Typography
            sx={{
              mt: 0.5,

              fontSize:
                10,

              color:
                "#7c8d9c",
            }}
          >
            {loadError}
          </Typography>

        </Box>

      </Box>
    );
  }


  return (
    <Box
      sx={{
        width:
          "100%",

        height:
          "calc(100vh - 64px)",

        minHeight:
          600,

        display:
          "flex",

        flexDirection:
          "column",

        bgcolor:
          "#eef3f6",

        overflow:
          "hidden",
      }}
    >

      {/* ====================================================================
          BUILDER TOOLBAR
      ==================================================================== */}

      <Box
        sx={{
          height:
            52,

          flex:
            "0 0 52px",

          px: 1.8,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: 2,

          borderBottom:
            "1px solid #dce5eb",

          bgcolor:
            "#fff",
        }}
      >

        {/* LEFT */}

        <Box
          sx={{
            minWidth:
              0,

            display:
              "flex",

            alignItems:
              "center",

            gap: 1,
          }}
        >

          <Box
            sx={{
              width:
                30,

              height:
                30,

              display:
                "grid",

              placeItems:
                "center",

              bgcolor:
                "#eaf4f7",

              color:
                "#2188a0",
            }}
          >

            <WebOutlinedIcon
              sx={{
                fontSize:
                  18,
              }}
            />

          </Box>


          <Box
            sx={{
              minWidth:
                0,
            }}
          >

            <Typography
              noWrap

              sx={{
                fontSize:
                  12.5,

                fontWeight:
                  700,

                color:
                  "#203a50",
              }}
            >
              {
                experience.name ||
                "Enterprise Experience Builder"
              }
            </Typography>


            <Typography
              sx={{
                mt:
                  -0.1,

                fontSize:
                  8.8,

                color:
                  "#8a98a5",
              }}
            >
              {rowsCount}{" "}
              {rowsCount ===
              1
                ? "row"
                : "rows"}
              {" · "}
              {componentCount}{" "}
              {componentCount ===
              1
                ? "component"
                : "components"}
            </Typography>

          </Box>

        </Box>


        {/* RIGHT */}

        <Box
          sx={{
            display:
              "flex",

            alignItems:
              "center",

            gap: 0.8,
          }}
        >

          

          <Button
              size="small"

              variant="outlined"

              startIcon={
                <SettingsOutlinedIcon
                  sx={{
                    fontSize:
                      "15px !important",
                  }}
                />
              }

              onClick={() =>
                setSettingsOpen(
                  true
                )
              }

              sx={{
                minHeight:
                  31,

                px:
                  1.3,

                textTransform:
                  "none",

                fontSize:
                  10,

                borderColor:
                  "#ccd8e1",

                color:
                  "#50677a",
              }}
            >
              Page Settings
            </Button>

              <Button
  size="small"

  variant="contained"

  startIcon={
    <SaveOutlinedIcon
      sx={{
        fontSize:
          "15px !important",
      }}
    />
  }

  onClick={
    handleSave
  }

  disabled={
    savingExperience ||
    loadingExperience
  }

  sx={{
    minHeight:
      31,

    px:
      1.5,

    bgcolor:
      "#0879df",

    textTransform:
      "none",

    fontSize:
      10,

    borderRadius:
      "3px",

    "&:hover": {
      bgcolor:
        "#066bc5",
    },
  }}
>
  {savingExperience
    ? "Saving..."
    : experience?.id
      ? "Save Changes"
      : "Save Experience"}
</Button>

        </Box>

      </Box>


      {/* ====================================================================
          BUILDER WORKSPACE
      ==================================================================== */}

      <Box
        sx={{
          flex:
            1,

          minHeight:
            0,

          display:
            "flex",

          overflow:
            "hidden",
        }}
      >

       


        {/* CANVAS */}

        <Box
          sx={{
            flex:
              1,

            minWidth:
              0,

            overflow:
              "auto",

            bgcolor:
              "#e9eef2",
          }}
        >

          <Box
              sx={{
                width:
                  "100%",

                minWidth:
                  0,

                minHeight:
                  "100%",
              }}
            >

            <ExperienceCanvas
              experience={
                experience
              }

              onExperienceChange={
                setExperience
              }

              onAddComponent={
                handleAddComponent
              }

              renderComponent={
                renderComponent
              }
            />

          </Box>

        </Box>

      </Box>

 <CreateExperienceModal
  open={
    settingsOpen
  }

  mode=
    "edit"

  value={
    experience
  }

  onClose={() =>
    setSettingsOpen(
      false
    )
  }

  onSave={(updatedExperience) => {

    /*
     * Apply locally.
     *
     * Database persistence still happens
     * only when Save Changes is clicked.
     */
    setExperience(
      updatedExperience
    );


    setSettingsOpen(
      false
    );
  }}
/>
              {componentModals}
    </Box>
  );
}