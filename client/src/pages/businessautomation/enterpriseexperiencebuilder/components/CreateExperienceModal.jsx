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
  DialogTitle,
  Typography,
} from "@mui/material";

import ExperienceSettingsForm, {
  createInitialExperience,
} from "./ExperienceSettingsForm";


export default function CreateExperienceModal({
  open,

  saving =
    false,

  mode =
    "create",

  value =
    null,

  onClose,

  onSave,
}) {  

  const [
    experience,
    setExperience,
  ] =
    useState(
      createInitialExperience
    );


  /*
   * Every time the modal opens,
   * start with a completely clean page.
   */
 useEffect(() => {

  if (
    !open
  ) {
    return;
  }


  if (
    mode ===
    "edit" &&
    value
  ) {

    /*
     * Preserve current page configuration
     * when opening Page Settings.
     */
    setExperience({
      ...createInitialExperience(),

      ...value,

      page: {
        ...createInitialExperience()
          .page,

        ...(
          value?.page ||
          {}
        ),
      },

      shell: {
        ...createInitialExperience()
          .shell,

        ...(
          value?.shell ||
          {}
        ),

        leftSidebar: {
          ...createInitialExperience()
            .shell
            .leftSidebar,

          ...(
            value
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
            value
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
          value?.hero ||
          {}
        ),

        config: {
          ...createInitialExperience()
            .hero
            .config,

          ...(
            value
              ?.hero
              ?.config ||
            {}
          ),
        },
      },
    });


    return;
  }


  /*
   * Create mode always starts clean.
   */
  setExperience(
    createInitialExperience()
  );

}, [
  open,
  mode,
  value,
]);


  const handleSave =
    () => {

      const name =
        String(
          experience
            ?.name ||
          ""
        ).trim();


      if (
        !name
      ) {

        window.alert(
          "Please enter an Experience Name."
        );

        return;
      }


      onSave?.({
        ...experience,

        name,
      });
    };


  return (
    <Dialog
      open={
        open
      }

      onClose={
        saving
          ? undefined
          : onClose
      }

      maxWidth=
        "md"

      fullWidth

      PaperProps={{
                sx: {
                 
                  width:
                    "min(920px, 94vw)",

                  maxWidth:
                    "920px",

                  maxHeight:
                    "86vh",

                  borderRadius:
                    "3px",

                  overflow:
                    "hidden",

                  boxShadow:
                    "0 18px 50px rgba(28,45,65,.22)",
                },
              }}
    >

      {/* ================================================================
          HEADER
      ================================================================ */}
<DialogTitle
  sx={{
    px:
      2.2,

    py:
      1.35,

    bgcolor:
      "#2188a0",

    color:
      "#ffffff",

    borderBottom:
      "1px solid rgba(0,0,0,.10)",
  }}
>
  <Typography
    sx={{
      fontSize:
        14.5,

      fontWeight:
        700,

      letterSpacing:
        "-0.01em",
    }}
  >
    {mode === "edit"
      ? "Experience Settings"
      : "Create Enterprise Experience"}
  </Typography>

  <Typography
    sx={{
      mt:
        0.2,

      fontSize:
        10.5,

      color:
        "rgba(255,255,255,.80)",
    }}
  >
    {mode === "edit"
      ? "Configure layout, hero and sidebar behavior."
      : "Define the initial layout, hero and sidebar behavior."}
  </Typography>
</DialogTitle>

      {/* ================================================================
          SETTINGS
      ================================================================ */}

<DialogContent
  sx={{
    p:
      "0 !important",

    maxHeight:
      "70vh",

    overflowY:
      "auto",

    bgcolor:
      "#f6f8fa",
  }}
>
  <ExperienceSettingsForm
    experience={
      experience
    }

    onChange={
      setExperience
    }
  />
</DialogContent>
      {/* ================================================================
          ACTIONS
      ================================================================ */}

<DialogActions
  sx={{
    px:
      2,

    py:
      1.2,

    borderTop:
      "1px solid #e1e7ec",

    bgcolor:
      "#ffffff",

    gap:
      0.8,
  }}
>

  <Button
    size="small"

    variant="outlined"

    disabled={
      saving
    }

    onClick={
      onClose
    }

    sx={{
      minHeight:
        31,

      px:
        1.5,

      borderRadius:
        "3px",

      textTransform:
        "none",

      fontSize:
        10.5,

      borderColor:
        "#cbd6df",

      color:
        "#52677a",
    }}
  >
    Cancel
  </Button>


  <Button
    size="small"

    variant="contained"

    disabled={
      saving
    }

    onClick={
      handleSave
    }

    sx={{
      minHeight:
        31,

      px:
        1.7,

      borderRadius:
        "3px",

      bgcolor:
        "#0879df",

      textTransform:
        "none",

      fontSize:
        10.5,

      "&:hover": {
        bgcolor:
          "#066bc5",
      },
    }}
  >
    {saving
      ? mode === "edit"
        ? "Applying..."
        : "Creating..."
      : mode === "edit"
        ? "Apply Settings"
        : "Create Experience"}
  </Button>

</DialogActions>
    </Dialog>
  );
}