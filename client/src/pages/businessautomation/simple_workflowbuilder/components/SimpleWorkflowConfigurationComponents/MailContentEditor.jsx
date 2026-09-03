import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatAlignJustifyIcon from "@mui/icons-material/FormatAlignJustify";

import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";

import LinkIcon from "@mui/icons-material/Link";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";

import {
  LexicalComposer,
} from "@lexical/react/LexicalComposer";

import {
  RichTextPlugin,
} from "@lexical/react/LexicalRichTextPlugin";

import {
  ContentEditable,
} from "@lexical/react/LexicalContentEditable";

import {
  HistoryPlugin,
} from "@lexical/react/LexicalHistoryPlugin";

import {
  OnChangePlugin,
} from "@lexical/react/LexicalOnChangePlugin";

import {
  useLexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";

import {
  ListPlugin,
} from "@lexical/react/LexicalListPlugin";

import {
  LinkPlugin,
} from "@lexical/react/LexicalLinkPlugin";

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";

import {
  $createLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from "@lexical/link";

import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from "@lexical/html";


/* ============================================================
   TOOLBAR BUTTON
============================================================ */

function ToolbarButton({
  title,
  children,
  onClick,
  active = false,
}) {
  return (
    <Tooltip title={title} arrow>
      <IconButton
        size="small"
        onMouseDown={(event) => {
          /*
           * Prevent the editor from losing the current
           * text selection when clicking the toolbar.
           */
          event.preventDefault();
        }}
        onClick={onClick}
        sx={{
          width: 27,
          height: 27,

          p: 0,

          borderRadius: "3px",

          color: active
            ? "#0879df"
            : "#455e72",

          bgcolor: active
            ? "#e8f4fb"
            : "transparent",

          "&:hover": {
            bgcolor: "#edf5fb",
            color: "#0879df",
          },

          "& .MuiSvgIcon-root": {
            fontSize: 15,
          },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}


/* ============================================================
   TOOLBAR SEPARATOR
============================================================ */

function ToolbarSeparator() {
  return (
    <Box
      sx={{
        width: "1px",
        height: 19,

        mx: 0.25,

        flexShrink: 0,

        bgcolor: "#dce4ea",
      }}
    />
  );
}


/* ============================================================
   LEXICAL TOOLBAR
============================================================ */

function MailToolbar() {
  const [editor] =
    useLexicalComposerContext();

  const [formatState, setFormatState] =
    useState({
      bold: false,
      italic: false,
      underline: false,
    });


  /* ------------------------------------------------------------
     Update active toolbar buttons
  ------------------------------------------------------------ */

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const selection =
            $getSelection();

          if (
            !$isRangeSelection(
              selection
            )
          ) {
            return;
          }

          setFormatState({
            bold:
              selection.hasFormat(
                "bold"
              ),

            italic:
              selection.hasFormat(
                "italic"
              ),

            underline:
              selection.hasFormat(
                "underline"
              ),
          });
        });
      }
    );
  }, [editor]);


  /* ------------------------------------------------------------
     LINK
  ------------------------------------------------------------ */

  const insertLink = () => {
    const url =
      window.prompt(
        "Enter link URL"
      );

    if (!url) return;

    editor.dispatchCommand(
      TOGGLE_LINK_COMMAND,
      url
    );
  };


  /* ------------------------------------------------------------
     TABLE

     Lightweight HTML-style table insertion.
     We intentionally keep this simple for mail content.
  ------------------------------------------------------------ */

  const insertTable = () => {
  window.alert(
    "Table editing will be enabled after adding the Lexical table nodes."
  );
};


  /* ------------------------------------------------------------
     CLEAR FORMATTING
  ------------------------------------------------------------ */

  const clearFormatting = () => {
    editor.update(() => {
      const selection =
        $getSelection();

      if (
        !$isRangeSelection(
          selection
        )
      ) {
        return;
      }

      /*
       * Toggle known formatting off only when active.
       */

      if (
        selection.hasFormat(
          "bold"
        )
      ) {
        editor.dispatchCommand(
          FORMAT_TEXT_COMMAND,
          "bold"
        );
      }

      if (
        selection.hasFormat(
          "italic"
        )
      ) {
        editor.dispatchCommand(
          FORMAT_TEXT_COMMAND,
          "italic"
        );
      }

      if (
        selection.hasFormat(
          "underline"
        )
      ) {
        editor.dispatchCommand(
          FORMAT_TEXT_COMMAND,
          "underline"
        );
      }
    });
  };


  return (
    <Box
      sx={{
        minHeight: 35,

        px: 0.55,
        py: 0.35,

        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",

        gap: 0.1,

        bgcolor: "#fbfcfd",

        borderBottom:
          "1px solid #dce5ec",
      }}
    >

      {/* TEXT FORMAT */}

      <ToolbarButton
        title="Bold"
        active={formatState.bold}
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_TEXT_COMMAND,
            "bold"
          )
        }
      >
        <FormatBoldIcon />
      </ToolbarButton>


      <ToolbarButton
        title="Italic"
        active={formatState.italic}
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_TEXT_COMMAND,
            "italic"
          )
        }
      >
        <FormatItalicIcon />
      </ToolbarButton>


      <ToolbarButton
        title="Underline"
        active={
          formatState.underline
        }
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_TEXT_COMMAND,
            "underline"
          )
        }
      >
        <FormatUnderlinedIcon />
      </ToolbarButton>


      <ToolbarSeparator />


      {/* ALIGNMENT */}

      <ToolbarButton
        title="Align left"
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_ELEMENT_COMMAND,
            "left"
          )
        }
      >
        <FormatAlignLeftIcon />
      </ToolbarButton>


      <ToolbarButton
        title="Align center"
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_ELEMENT_COMMAND,
            "center"
          )
        }
      >
        <FormatAlignCenterIcon />
      </ToolbarButton>


      <ToolbarButton
        title="Align right"
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_ELEMENT_COMMAND,
            "right"
          )
        }
      >
        <FormatAlignRightIcon />
      </ToolbarButton>


      <ToolbarButton
        title="Justify"
        onClick={() =>
          editor.dispatchCommand(
            FORMAT_ELEMENT_COMMAND,
            "justify"
          )
        }
      >
        <FormatAlignJustifyIcon />
      </ToolbarButton>


      <ToolbarSeparator />


      {/* LISTS */}

      <ToolbarButton
        title="Bullet list"
        onClick={() =>
          editor.dispatchCommand(
            INSERT_UNORDERED_LIST_COMMAND,
            undefined
          )
        }
      >
        <FormatListBulletedIcon />
      </ToolbarButton>


      <ToolbarButton
        title="Numbered list"
        onClick={() =>
          editor.dispatchCommand(
            INSERT_ORDERED_LIST_COMMAND,
            undefined
          )
        }
      >
        <FormatListNumberedIcon />
      </ToolbarButton>


      <ToolbarSeparator />


      {/* LINK */}

      <ToolbarButton
        title="Insert link"
        onClick={insertLink}
      >
        <LinkIcon />
      </ToolbarButton>


      {/* TABLE */}

      <ToolbarButton
        title="Insert table"
        onClick={insertTable}
      >
        <TableChartOutlinedIcon />
      </ToolbarButton>


      <ToolbarSeparator />


      {/* CLEAR */}

      <ToolbarButton
        title="Clear formatting"
        onClick={clearFormatting}
      >
        <FormatClearIcon />
      </ToolbarButton>


      {/* UNDO */}

      <ToolbarButton
        title="Undo"
        onClick={() =>
          editor.dispatchCommand(
            UNDO_COMMAND,
            undefined
          )
        }
      >
        <UndoIcon />
      </ToolbarButton>


      {/* REDO */}

      <ToolbarButton
        title="Redo"
        onClick={() =>
          editor.dispatchCommand(
            REDO_COMMAND,
            undefined
          )
        }
      >
        <RedoIcon />
      </ToolbarButton>

    </Box>
  );
}


/* ============================================================
   INITIAL HTML PLUGIN

   Converts the existing mail_content.body HTML into Lexical
   nodes when the editor is created.
============================================================ */

function InitialHtmlPlugin({
  html,
}) {
  const [editor] =
    useLexicalComposerContext();

  const initialized =
    useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    if (!html) return;

    editor.update(() => {
      const parser =
        new DOMParser();

      const dom =
        parser.parseFromString(
          html,
          "text/html"
        );

      const nodes =
        $generateNodesFromDOM(
          editor,
          dom
        );

      const root =
        $getRoot();

      root.clear();

      root.append(...nodes);
    });
  }, [editor, html]);

  return null;
}


/* ============================================================
   MAIL CONTENT SYNC

   Converts Lexical state back to HTML and passes it to the
   existing workflow `change()` function.
============================================================ */

function MailChangePlugin({
  onHtmlChange,
  mailDraftRef,
}) {
  const [editor] =
    useLexicalComposerContext();

  useEffect(() => {
    /*
     * Preserve the existing ref contract used by the workflow.
     *
     * mailDraftRef.current now points to the Lexical editor
     * instead of TinyMCE.
     */
    if (mailDraftRef) {
      mailDraftRef.current =
        editor;
    }

    return () => {
      if (
        mailDraftRef?.current ===
        editor
      ) {
        mailDraftRef.current =
          null;
      }
    };
  }, [
    editor,
    mailDraftRef,
  ]);


  const handleChange =
    useCallback(
      (editorState) => {
        editorState.read(() => {
          const html =
            $generateHtmlFromNodes(
              editor,
              null
            );

          onHtmlChange(html);
        });
      },
      [
        editor,
        onHtmlChange,
      ]
    );


  return (
    <OnChangePlugin
      onChange={handleChange}
      ignoreSelectionChange
    />
  );
}


/* ============================================================
   WORD COUNT
============================================================ */

function WordCount() {
  const [editor] =
    useLexicalComposerContext();

  const [stats, setStats] =
    useState({
      words: 0,
      characters: 0,
    });

  useEffect(() => {
    return editor.registerTextContentListener(
      (text) => {
        const trimmed =
          text.trim();

        setStats({
          words:
            trimmed.length > 0
              ? trimmed
                  .split(/\s+/)
                  .length
              : 0,

          characters:
            text.length,
        });
      }
    );
  }, [editor]);


  return (
    <Typography
      sx={{
        fontSize: 7.5,
        color: "#8a99a6",
        whiteSpace: "nowrap",
      }}
    >
      words: {stats.words}
      {" | "}
      characters:{" "}
      {stats.characters}
    </Typography>
  );
}


/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function MailContentEditor({
  local,
  change,
  isInitiate,

  mailDraftRef,

  showTableBorders,
  setShowTableBorders,

  wrapContent,

  applyMailToFuture,
  setApplyMailToFuture,
}) {

  /* ------------------------------------------------------------
     Existing mail body
  ------------------------------------------------------------ */

  const mailBody =
    typeof local?.mail_content ===
    "object"
      ? local?.mail_content
          ?.body || ""
      : local?.mail_content || "";


  /* ------------------------------------------------------------
     Preserve existing mail_content structure
  ------------------------------------------------------------ */

  const handleMailChange =
    useCallback(
      (content) => {
        if (
          local?.mail_content &&
          typeof local.mail_content ===
            "object"
        ) {
          change(
            "mail_content",
            {
              ...local.mail_content,

              body: content,
            }
          );
        } else {
          change(
            "mail_content",
            {
              body: content,
            }
          );
        }
      },
      [
        change,
        local?.mail_content,
      ]
    );


  /* ------------------------------------------------------------
     Lexical configuration
  ------------------------------------------------------------ */

  const initialConfig =
    React.useMemo(
      () => ({
        namespace:
          "AUGMISWorkflowMailEditor",

        nodes: [
          ListNode,
          ListItemNode,
          LinkNode,
        ],

        theme: {
          paragraph:
            "augmis-mail-paragraph",

          text: {
            bold:
              "augmis-mail-bold",

            italic:
              "augmis-mail-italic",

            underline:
              "augmis-mail-underline",
          },

          list: {
            ul:
              "augmis-mail-ul",

            ol:
              "augmis-mail-ol",

            listitem:
              "augmis-mail-li",
          },

          link:
            "augmis-mail-link",
        },

        onError(error) {
          console.error(
            "[AUGMIS Mail Lexical]",
            error
          );
        },
      }),
      []
    );


  return (
    <Box
      sx={{
        width: "100%",
      }}
    >

      {/* ======================================================
          MAIL CONTENT
      ====================================================== */}

      <Box
        sx={{
          width: "100%",

          border:
            "1px solid #bfd1e0",

          borderRadius: "3px",

          overflow: "hidden",

          bgcolor: "#ffffff",
        }}
      >

        {/* ====================================================
            DEAR RECIPIENT
        ==================================================== */}

        <Box
          sx={{
            minHeight: 31,

            px: 0.9,

            display: "flex",
            alignItems: "center",

            borderBottom:
              "1px solid #e1e7ec",

            bgcolor: "#ffffff",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"

                checked={Boolean(
                  local
                    ?.mail_content
                    ?.dear_recipient
                )}

                onChange={(e) => {
                  change(
                    "mail_content",
                    {
                      ...(typeof local
                        ?.mail_content ===
                      "object"
                        ? local.mail_content
                        : {}),

                      dear_recipient:
                        e.target
                          .checked,

                      body:
                        mailBody,
                    }
                  );
                }}

                sx={{
                  p: 0.3,

                  "& .MuiSvgIcon-root":
                    {
                      fontSize: 15,
                    },
                }}
              />
            }

            label={
              <>
                Dear &lt;Recipient&gt;

                <Box
                  component="span"
                  sx={{
                    ml: 0.55,

                    color:
                      "#81909c",

                    fontSize: 8,
                  }}
                >
                  — add greeting before
                  mail content
                </Box>
              </>
            }

            sx={{
              m: 0,

              "& .MuiFormControlLabel-label":
                {
                  fontSize: 8.5,

                  color:
                    "#405a6d",
                },
            }}
          />
        </Box>


        {/* ====================================================
            LEXICAL
        ==================================================== */}

        <LexicalComposer
          initialConfig={
            initialConfig
          }
        >

          {/* TOOLBAR */}

          <MailToolbar />


          {/* EDITOR */}

          <Box
            sx={{
              position: "relative",

              bgcolor: "#ffffff",
            }}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-placeholder="Enter mail content..."
                  placeholder={
                    <Box
                      sx={{
                        position:
                          "absolute",

                        top: 10,
                        left: 12,

                        pointerEvents:
                          "none",

                        color:
                          "#a0adb8",

                        fontSize:
                          10,
                      }}
                    >
                      Enter mail
                      content...
                    </Box>
                  }

                  style={{
                    minHeight:
                      "118px",

                    maxHeight:
                      "220px",

                    overflowY:
                      "auto",

                    outline:
                      "none",

                    padding:
                      "10px 12px",

                    boxSizing:
                      "border-box",

                    fontFamily:
                      "Arial, Helvetica, sans-serif",

                    fontSize:
                      "10.5px",

                    lineHeight:
                      1.6,

                    color:
                      "#30485c",

                    background:
                      "#ffffff",

                    whiteSpace:
                      wrapContent
                        ? "pre-wrap"
                        : "normal",

                    overflowWrap:
                      "break-word",
                  }}
                />
              }

              ErrorBoundary={
                LexicalErrorBoundary
              }
            />


            <InitialHtmlPlugin
              html={mailBody}
            />

            <HistoryPlugin />

            <ListPlugin />

            <LinkPlugin />

            <MailChangePlugin
              onHtmlChange={
                handleMailChange
              }
              mailDraftRef={
                mailDraftRef
              }
            />

          </Box>


          {/* ==================================================
              STATUS BAR
          ================================================== */}

          <Box
            sx={{
              minHeight: 23,

              px: 0.8,

              display: "flex",

              alignItems: "center",

              justifyContent:
                "space-between",

              gap: 1,

              borderTop:
                "1px solid #e1e7ec",

              bgcolor: "#fbfcfd",
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems:
                  "center",

                gap: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: 8,

                  color:
                    "#8998a5",
                }}
              >
                +
              </Typography>

              <Box
                sx={{
                  px: 0.55,
                  py: 0.05,

                  border:
                    "1px solid #c8dae7",

                  borderRadius:
                    "3px",

                  bgcolor:
                    "#edf6fb",

                  color:
                    "#1784bb",

                  fontFamily:
                    "monospace",

                  fontSize:
                    7.5,
                }}
              >
                {"<p>"}
              </Box>
            </Box>

            <WordCount />
          </Box>

        </LexicalComposer>

      </Box>


      {/* ======================================================
          OPTIONS
      ====================================================== */}

      <Stack
        direction="row"

        spacing={1.6}

        useFlexGap

        flexWrap="wrap"

        sx={{
          mt: 0.55,

          "& .MuiFormControlLabel-root":
            {
              ml: 0,
              mr: 0,
            },

          "& .MuiFormControlLabel-label":
            {
              fontSize: 8.5,

              color:
                "#65798a",
            },

          "& .MuiCheckbox-root":
            {
              p: 0.35,

              "& .MuiSvgIcon-root":
                {
                  fontSize: 15,
                },
            },
        }}
      >

        {/* SHOW TABLE BORDERS */}

        <FormControlLabel
          control={
            <Checkbox
              size="small"

              checked={Boolean(
                showTableBorders
              )}

              onChange={(e) =>
                setShowTableBorders?.(
                  e.target.checked
                )
              }
            />
          }

          label="Show table borders"
        />


        {/* FIXED WIDTH */}

        <FormControlLabel
          control={
            <Checkbox
              size="small"

              checked={Boolean(
                wrapContent
              )}

              disabled
            />
          }

          label="Fixed-width content"
        />


        {/* APPLY TO FUTURE STEPS */}

        {isInitiate && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"

                checked={Boolean(
                  applyMailToFuture
                )}

                onChange={(e) =>
                  setApplyMailToFuture?.(
                    e.target.checked
                  )
                }
              />
            }

            label="Apply to future steps"
          />
        )}

      </Stack>


      {/* ======================================================
          LEXICAL CONTENT STYLES
      ====================================================== */}

      <Box
        component="style"
      >
        {`
          .augmis-mail-paragraph {
            margin: 0 0 7px 0;
          }

          .augmis-mail-bold {
            font-weight: 700;
          }

          .augmis-mail-italic {
            font-style: italic;
          }

          .augmis-mail-underline {
            text-decoration: underline;
          }

          .augmis-mail-ul {
            margin: 4px 0;
            padding-left: 22px;
          }

          .augmis-mail-ol {
            margin: 4px 0;
            padding-left: 22px;
          }

          .augmis-mail-li {
            margin: 2px 0;
          }

          .augmis-mail-link {
            color: #0879df;
            text-decoration: underline;
          }
        `}
      </Box>

    </Box>
  );
}


/* ============================================================
   LEXICAL ERROR BOUNDARY
============================================================ */

function LexicalErrorBoundary({
  children,
}) {
  return children;
}