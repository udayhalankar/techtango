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
  TextField,
  Typography,
} from "@mui/material";

import RichTextEditor from
  "./richtext/RichTextEditor";

import {
  dialogBackdropSx,
  dialogPaperSx,
  dialogHeaderSx,
  dialogTitleSx,
  dialogSubtitleSx,
  dialogBodySx,
  dialogFooterSx,
  gentleFieldSx,
  cancelButtonSx,
  primaryButtonSx,
  closeIconButtonSx,
} from "./dashboardDialogStyles";


export default function TextConfigModal({
  open,
  slot,
  initialConfig,
  onClose,
  onSave,
}) {

  const [
    title,
    setTitle,
  ] = useState("");


  const [
    html,
    setHtml,
  ] = useState("");

  const [
  editorReady,
  setEditorReady,
  ] = useState(false);


  const [
    editorSession,
    setEditorSession,
  ] = useState(0);


  useEffect(() => {

  if (!open) {

    setEditorReady(
      false
    );

    return;
  }


  /*
   * Do not mount Lexical until the
   * existing component content has
   * been loaded into modal state.
   */

  setEditorReady(
    false
  );


  setTitle(
    initialConfig
      ?.title ||
    ""
  );


  setHtml(
    initialConfig
      ?.content
      ?.html ||
    ""
  );


  setEditorSession(
    (prev) =>
      prev + 1
  );


  setEditorReady(
    true
  );

}, [
  open,
  initialConfig,
]);


  const handleSave =
    () => {

      onSave?.(
        {
          /*
           * Preserve layout information,
           * including merged-slot metadata.
           */
          ...(initialConfig ||
            {}),

          type:
            "text",

          title:
            title.trim(),

          content: {
            ...(
              initialConfig
                ?.content ||
              {}
            ),

            html,
          },
        },

        slot
      );
    };


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
        sx:
          dialogBackdropSx,
      }}

      PaperProps={{
        sx: {
          ...dialogPaperSx,

          width:
            "min(900px, 94vw)",

          maxHeight:
            "90vh",
        },
      }}
    >

      {/* HEADER */}

      <Box
        sx={
          dialogHeaderSx
        }
      >

        <Box
          sx={{
            minWidth: 0,
          }}
        >

          <Typography
            sx={
              dialogTitleSx
            }
          >
            Configure Text
          </Typography>


          <Typography
            sx={
              dialogSubtitleSx
            }
          >
            Add formatted text content to {slot?.slotId || "this dashboard area"}.
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

          display:
            "grid",

          gap: 1.5,

          overflowY:
            "auto",
        }}
      >

        <TextField
          label=
            "Component Title"

          value={
            title
          }

          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }

          fullWidth

          sx={
            gentleFieldSx
          }
        />


        <Box>

          <Typography
            sx={{
              mb: 0.65,

              fontSize:
                10.5,

              fontWeight:
                600,

              color:
                "#53677b",
            }}
          >
            Content
          </Typography>


          {editorReady && (

  <RichTextEditor
    key={
      `${
        slot?.slotId ||
        "text"
      }-${editorSession}`
    }

    value={
      html
    }

    onChange={
      setHtml
    }

    minHeight={
      260
    }
  />

)}

        </Box>

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
          onClick={
            handleSave
          }

          variant=
            "contained"

          sx={
            primaryButtonSx
          }
        >
          Save Text
        </Button>

      </DialogActions>

    </Dialog>
  );
}