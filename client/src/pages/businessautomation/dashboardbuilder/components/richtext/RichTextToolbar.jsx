import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";

import FormatBoldIcon from
  "@mui/icons-material/FormatBold";

import FormatItalicIcon from
  "@mui/icons-material/FormatItalic";

import FormatUnderlinedIcon from
  "@mui/icons-material/FormatUnderlined";

import FormatAlignLeftIcon from
  "@mui/icons-material/FormatAlignLeft";

import FormatAlignCenterIcon from
  "@mui/icons-material/FormatAlignCenter";

import FormatAlignRightIcon from
  "@mui/icons-material/FormatAlignRight";

import FormatListBulletedIcon from
  "@mui/icons-material/FormatListBulleted";

import FormatListNumberedIcon from
  "@mui/icons-material/FormatListNumbered";

import LinkOutlinedIcon from
  "@mui/icons-material/LinkOutlined";

import UndoOutlinedIcon from
  "@mui/icons-material/UndoOutlined";

import RedoOutlinedIcon from
  "@mui/icons-material/RedoOutlined";

import FormatColorTextOutlinedIcon from
  "@mui/icons-material/FormatColorTextOutlined";

import BorderColorOutlinedIcon from
  "@mui/icons-material/BorderColorOutlined";

// import HorizontalRuleOutlinedIcon from
//   "@mui/icons-material/HorizontalRuleOutlined";


import {
  useLexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";


import {
  $createHeadingNode,
  $isHeadingNode,
} from "@lexical/rich-text";


import {
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";


import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";


import {
  TOGGLE_LINK_COMMAND,
} from "@lexical/link";

import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";

import ImageOutlinedIcon from
  "@mui/icons-material/ImageOutlined";

import {
  INSERT_RICH_TEXT_IMAGE_COMMAND,
} from "./RichTextImagePlugin";


// import {
//   INSERT_HORIZONTAL_RULE_COMMAND,
// } from "@lexical/react/LexicalHorizontalRuleNode";


const buttonSx = {
  width: 30,
  height: 30,

  borderRadius:
    "6px",

  color:
    "#60778d",

  "&:hover": {
    bgcolor:
      "#edf4f8",

    color:
      "#2e6f98",
  },
};


/* ==========================================================================
   TOOLBAR
========================================================================== */

export default function RichTextToolbar() {

  const [
    editor,
  ] =
    useLexicalComposerContext();

    const imageInputRef =
  useRef(null);

  const insertDivider =
  () => {

    editor.update(
      () => {

        const selection =
          $getSelection();


        if (
          !$isRangeSelection(
            selection
          )
        ) {
          return;
        }


        const currentNode =
          selection
            .anchor
            .getNode();


        const topLevel =
          currentNode
            .getTopLevelElement();


        if (!topLevel) {
          return;
        }


        const divider =
          $createParagraphNode();


        const dividerText =
          $createTextNode(
            "────────────────────────────────────────"
          );


        divider.append(
          dividerText
        );


        topLevel.insertAfter(
          divider
        );


        const nextParagraph =
          $createParagraphNode();


        divider.insertAfter(
          nextParagraph
        );


        nextParagraph.select();
      }
    );
  };

  const [
    blockType,
    setBlockType,
  ] = useState(
    "paragraph"
  );


  const [
    isBold,
    setIsBold,
  ] = useState(false);


  const [
    isItalic,
    setIsItalic,
  ] = useState(false);


  const [
    isUnderline,
    setIsUnderline,
  ] = useState(false);


  const textColorInputRef =
    useRef(null);


  const highlightInputRef =
    useRef(null);


  /* =========================================================================
     KEEP EDITOR SELECTION
  ========================================================================= */

  const preserveEditorSelection =
    (
      event
    ) => {

      event.preventDefault();
    };


  /* =========================================================================
     TOOLBAR STATE
  ========================================================================= */

  const updateToolbar =
    useCallback(
      () => {

        const selection =
          $getSelection();


        if (
          !$isRangeSelection(
            selection
          )
        ) {
          return;
        }


        setIsBold(
          selection.hasFormat(
            "bold"
          )
        );


        setIsItalic(
          selection.hasFormat(
            "italic"
          )
        );


        setIsUnderline(
          selection.hasFormat(
            "underline"
          )
        );


        const anchorNode =
          selection
            .anchor
            .getNode();


        const element =
          anchorNode
            .getKey() ===
          "root"
            ? anchorNode
            : anchorNode
                .getTopLevelElementOrThrow();


        if (
          $isHeadingNode(
            element
          )
        ) {

          setBlockType(
            element.getTag()
          );

        } else {

          setBlockType(
            "paragraph"
          );
        }
      },

      []
    );


  useEffect(() => {

    const unregisterSelection =
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,

        () => {

          editor
            .getEditorState()
            .read(
              updateToolbar
            );


          return false;
        },

        COMMAND_PRIORITY_LOW
      );


    const unregisterUpdate =
      editor.registerUpdateListener(
        ({
          editorState,
        }) => {

          editorState.read(
            updateToolbar
          );
        }
      );


    return () => {

      unregisterSelection();

      unregisterUpdate();
    };

  }, [
    editor,
    updateToolbar,
  ]);


  /* =========================================================================
     HEADINGS
  ========================================================================= */

  const setHeading =
    (
      value
    ) => {

      editor.update(
        () => {

          const selection =
            $getSelection();


          if (
            !$isRangeSelection(
              selection
            )
          ) {
            return;
          }


          if (
            value ===
            "paragraph"
          ) {

            $setBlocksType(
              selection,

              () =>
                $createParagraphNode()
            );


            return;
          }


          $setBlocksType(
            selection,

            () =>
              $createHeadingNode(
                value
              )
          );
        }
      );
    };


  /* =========================================================================
     INLINE STYLE
  ========================================================================= */

  const applyInlineStyle =
    (
      styles
    ) => {

      editor.update(
        () => {

          const selection =
            $getSelection();


          if (
            !$isRangeSelection(
              selection
            )
          ) {
            return;
          }


          $patchStyleText(
            selection,
            styles
          );
        }
      );
    };


  /* =========================================================================
     LINK
  ========================================================================= */

  const createLink =
    () => {

      const url =
        window.prompt(
          "Enter URL"
        );


      if (
        url === null
      ) {
        return;
      }


      editor.dispatchCommand(
        TOGGLE_LINK_COMMAND,

        url.trim() ||
        null
      );
    };


    const handleImageFile =
  (
    event
  ) => {

    const file =
      event
        .target
        .files?.[0];


    if (!file) {

      return;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      window.alert(
        "Please select an image file."
      );

      event.target.value =
        "";

      return;
    }


    /*
     * TEMPORARY FIRST PHASE:
     *
     * FileReader lets us prove that:
     * Node
     * Plugin
     * HTML generation
     * Save
     * Reopen Configure
     *
     * all work.
     *
     * Next step will replace this
     * data URL with server upload.
     */

    const reader =
      new FileReader();


    reader.onload =
      () => {

        const src =
          reader.result;


        if (
          typeof src !==
          "string"
        ) {

          return;
        }


        editor.dispatchCommand(
          INSERT_RICH_TEXT_IMAGE_COMMAND,

          {
            src,

            altText:
              file.name,

            width:
              500,
          }
        );
      };


    reader.readAsDataURL(
      file
    );


    /*
     * Allows selecting the same
     * image again later.
     */

    event.target.value =
      "";
  };


  return (
    <Box
      className=
        "augmis-rte-toolbar"

      sx={{
        minHeight: 42,

        px: 0.7,
        py: 0.5,

        display:
          "flex",

        alignItems:
          "center",

        flexWrap:
          "wrap",

        gap: 0.25,

        borderBottom:
          "1px solid #dce5ed",

        bgcolor:
          "#f8fafc",
      }}
    >

      {/* UNDO */}

      <Tooltip title="Undo">
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              UNDO_COMMAND,
              undefined
            )
          }
        >
          <UndoOutlinedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* REDO */}

      <Tooltip title="Redo">
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              REDO_COMMAND,
              undefined
            )
          }
        >
          <RedoOutlinedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>

     


      {/* BLOCK TYPE */}

      <Select
        size="small"

        value={
          blockType
        }

        onChange={(e) =>
          setHeading(
            e.target.value
          )
        }

        sx={{
          height: 30,

          minWidth: 105,

          mx: 0.5,

          fontSize: 10.5,

          "& .MuiSelect-select":
            {
              py: 0.5,
            },
        }}
      >
        <MenuItem
          value="paragraph"
        >
          Normal
        </MenuItem>

        <MenuItem value="h1">
          Heading 1
        </MenuItem>

        <MenuItem value="h2">
          Heading 2
        </MenuItem>

        <MenuItem value="h3">
          Heading 3
        </MenuItem>
      </Select>


      {/* BOLD */}

      <Tooltip title="Bold">
        <IconButton
          sx={{
            ...buttonSx,

            ...(isBold
              ? {
                  bgcolor:
                    "#e7f2f8",

                  color:
                    "#24789d",
                }
              : {}),
          }}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              FORMAT_TEXT_COMMAND,
              "bold"
            )
          }
        >
          <FormatBoldIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* ITALIC */}

      <Tooltip title="Italic">
        <IconButton
          sx={{
            ...buttonSx,

            ...(isItalic
              ? {
                  bgcolor:
                    "#e7f2f8",

                  color:
                    "#24789d",
                }
              : {}),
          }}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              FORMAT_TEXT_COMMAND,
              "italic"
            )
          }
        >
          <FormatItalicIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* UNDERLINE */}

      <Tooltip title="Underline">
        <IconButton
          sx={{
            ...buttonSx,

            ...(isUnderline
              ? {
                  bgcolor:
                    "#dff1f8",

                  color:
                    "#147da0",
                }
              : {}),
          }}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              FORMAT_TEXT_COMMAND,
              "underline"
            )
          }
        >
          <FormatUnderlinedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* TEXT COLOR */}

      <Box
        sx={{
          position:
            "relative",
        }}
      >

        <Tooltip
          title=
            "Text color"
        >
          <IconButton
            sx={
              buttonSx
            }

            onMouseDown={
              preserveEditorSelection
            }

            onClick={() =>
              textColorInputRef
                .current
                ?.click()
            }
          >
            <FormatColorTextOutlinedIcon
              sx={{
                fontSize: 18,
              }}
            />
          </IconButton>
        </Tooltip>


        <input
          ref={
            textColorInputRef
          }

          type="color"

          defaultValue=
            "#172b4d"

          onChange={(e) =>
            applyInlineStyle({
              color:
                e.target.value,
            })
          }

          style={{
            position:
              "absolute",

            width: 1,
            height: 1,

            opacity: 0,

            pointerEvents:
              "none",
          }}
        />

      </Box>


      {/* HIGHLIGHT */}

      <Box
        sx={{
          position:
            "relative",
        }}
      >

        <Tooltip
          title=
            "Highlight color"
        >
          <IconButton
            sx={
              buttonSx
            }

            onMouseDown={
              preserveEditorSelection
            }

            onClick={() =>
              highlightInputRef
                .current
                ?.click()
            }
          >
            <BorderColorOutlinedIcon
              sx={{
                fontSize: 18,
              }}
            />
          </IconButton>
        </Tooltip>


        <input
          ref={
            highlightInputRef
          }

          type="color"

          defaultValue=
            "#fff2a8"

          onChange={(e) =>
            applyInlineStyle({
              "background-color":
                e.target.value,
            })
          }

          style={{
            position:
              "absolute",

            width: 1,
            height: 1,

            opacity: 0,

            pointerEvents:
              "none",
          }}
        />

      </Box>


      {/* ALIGN LEFT */}

      <Tooltip
        title="Align left"
      >
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              FORMAT_ELEMENT_COMMAND,
              "left"
            )
          }
        >
          <FormatAlignLeftIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* CENTER */}

      <Tooltip title="Center">
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              FORMAT_ELEMENT_COMMAND,
              "center"
            )
          }
        >
          <FormatAlignCenterIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* RIGHT */}

      <Tooltip
        title="Align right"
      >
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              FORMAT_ELEMENT_COMMAND,
              "right"
            )
          }
        >
          <FormatAlignRightIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* BULLETS */}

      <Tooltip title="Bullets">
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              INSERT_UNORDERED_LIST_COMMAND,
              undefined
            )
          }
        >
          <FormatListBulletedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* NUMBERED */}

      <Tooltip
        title=
          "Numbered list"
      >
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={() =>
            editor.dispatchCommand(
              INSERT_ORDERED_LIST_COMMAND,
              undefined
            )
          }
        >
          <FormatListNumberedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* LINK */}

      <Tooltip title="Link">
        <IconButton
          sx={buttonSx}

          onMouseDown={
            preserveEditorSelection
          }

          onClick={
            createLink
          }
        >
          <LinkOutlinedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </IconButton>
      </Tooltip>


      {/* IMAGE */}

<Box
  sx={{
    position:
      "relative",
  }}
>

  <Tooltip
    title="Insert image"
  >
    <IconButton
      sx={
        buttonSx
      }

      onMouseDown={
        preserveEditorSelection
      }

      onClick={() =>
        imageInputRef
          .current
          ?.click()
      }
    >
      <ImageOutlinedIcon
        sx={{
          fontSize: 18,
        }}
      />
    </IconButton>
  </Tooltip>


  <input
    ref={
      imageInputRef
    }

    type="file"

    accept=
      "image/png,image/jpeg,image/webp,image/gif"

    onChange={
      handleImageFile
    }

    style={{
      display:
        "none",
    }}
  />

</Box>

 <Tooltip
  title="Insert divider"
>
  <IconButton
    sx={buttonSx}

    onMouseDown={
      preserveEditorSelection
    }

    onClick={
      insertDivider
    }
  >
    <Box
      sx={{
        width: 17,
        height: 10,
        position:
          "relative",

        "&::after": {
          content:
            '""',

          position:
            "absolute",

          left: 1,
          right: 1,
          top: "50%",

          borderTop:
            "1.5px solid currentColor",
        },
      }}
    />
  </IconButton>
</Tooltip>



    </Box>
  );
}