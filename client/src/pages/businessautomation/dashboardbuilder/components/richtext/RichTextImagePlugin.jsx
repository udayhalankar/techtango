import React, {
  useEffect,
} from "react";

import {
  useLexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";

import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,

  COMMAND_PRIORITY_EDITOR,

  createCommand,
} from "lexical";

import {
  $createRichTextImageNode,
  RichTextImageNode,
} from "./RichTextImageNode";


/* ==========================================================================
   INSERT IMAGE COMMAND
========================================================================== */

export const INSERT_RICH_TEXT_IMAGE_COMMAND =
  createCommand(
    "INSERT_RICH_TEXT_IMAGE_COMMAND"
  );


/* ==========================================================================
   IMAGE PLUGIN
========================================================================== */

export default function RichTextImagePlugin() {

  const [
    editor,
  ] =
    useLexicalComposerContext();


  useEffect(
    () => {

      if (
        !editor.hasNodes([
          RichTextImageNode,
        ])
      ) {

        throw new Error(
          "RichTextImagePlugin: RichTextImageNode is not registered."
        );
      }


      return editor.registerCommand(
        INSERT_RICH_TEXT_IMAGE_COMMAND,

        (
          payload
        ) => {

          if (
            !payload ||
            !payload.src
          ) {

            return false;
          }


          const imageNode =
            $createRichTextImageNode({
              src:
                payload.src,

              altText:
                payload.altText ||
                "",

              width:
                payload.width ||
                null,
            });


          const selection =
            $getSelection();


          /* ================================================================
             NORMAL CASE

             Put image immediately after the
             paragraph containing the cursor.
          ================================================================ */

          if (
            $isRangeSelection(
              selection
            )
          ) {

            const anchorNode =
              selection
                .anchor
                .getNode();


            const topLevel =
              anchorNode
                .getTopLevelElement();


            if (
              topLevel
            ) {

              topLevel.insertAfter(
                imageNode
              );


              const paragraph =
                $createParagraphNode();


              imageNode.insertAfter(
                paragraph
              );


              paragraph.select();


              return true;
            }
          }


          /* ================================================================
             FALLBACK

             If no normal cursor selection
             exists, append image to editor.
          ================================================================ */

          const root =
            $getRoot();


          root.append(
            imageNode
          );


          const paragraph =
            $createParagraphNode();


          root.append(
            paragraph
          );


          paragraph.select();


          return true;
        },

        COMMAND_PRIORITY_EDITOR
      );

    },

    [
      editor,
    ]
  );


  return null;
}