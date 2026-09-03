import React, {
  useEffect,
  useRef,
} from "react";

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
  ListPlugin,
} from "@lexical/react/LexicalListPlugin";

import {
  LinkPlugin,
} from "@lexical/react/LexicalLinkPlugin";

import {
  OnChangePlugin,
} from "@lexical/react/LexicalOnChangePlugin";

import {
  LexicalErrorBoundary,
} from "@lexical/react/LexicalErrorBoundary";

import {
  useLexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";

import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from "@lexical/html";

import {
  $getRoot,
  $insertNodes,
} from "lexical";

import {
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";

import {
  ListItemNode,
  ListNode,
} from "@lexical/list";

import {
  AutoLinkNode,
  LinkNode,
} from "@lexical/link";

import RichTextToolbar from
  "./RichTextToolbar";

import "./richTextEditor.css";

import {
  HorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";

import {
  RichTextImageNode,
} from "./RichTextImageNode";

import RichTextImagePlugin from
  "./RichTextImagePlugin";

/* ==========================================================================
   INITIAL HTML

   IMPORTANT:
   Load the incoming HTML ONCE when this editor instance is created.

   Previously this effect depended directly on `html`.
   Every keystroke caused:

   Lexical -> onChange -> parent state -> html prop ->
   InitialHtmlPlugin -> editor rewritten

   That destroyed normal Undo/Redo history.
========================================================================== */

function InitialHtmlPlugin({
  html,
}) {

  const [
    editor,
  ] =
    useLexicalComposerContext();


  const initialHtmlRef =
    useRef(
      html || ""
    );


  const initializedRef =
    useRef(false);


  useEffect(() => {

    if (
      initializedRef.current
    ) {
      return;
    }


    initializedRef.current =
      true;


    const initialHtml =
      initialHtmlRef.current;


    if (
      !initialHtml
    ) {
      return;
    }


    editor.update(
      () => {

        const parser =
          new DOMParser();


        const dom =
          parser.parseFromString(
            initialHtml,
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


        root.select();


        $insertNodes(
          nodes
        );
      }
    );

  }, [
    editor,
  ]);


  return null;
}


/* ==========================================================================
   EDITOR
========================================================================== */

export default function RichTextEditor({
  value = "",
  onChange,
  minHeight = 220,
}) {

  const initialConfig = {
    namespace:
      "AugmisRichTextEditor",

    theme: {
      paragraph:
        "augmis-rte-paragraph",

      quote:
        "augmis-rte-quote",

      text: {
          bold:
            "augmis-rte-bold",

          italic:
            "augmis-rte-italic",

          underline:
            "augmis-rte-underline",

          strikethrough:
            "augmis-rte-strikethrough",

          underlineStrikethrough:
            "augmis-rte-underline-strikethrough",
        },

      heading: {
        h1:
          "augmis-rte-h1",

        h2:
          "augmis-rte-h2",

        h3:
          "augmis-rte-h3",
      },

      list: {
        ul:
          "augmis-rte-ul",

        ol:
          "augmis-rte-ol",

        listitem:
          "augmis-rte-listitem",
      },

      link:
        "augmis-rte-link",
    },

    nodes: [
      HeadingNode,
      QuoteNode,
      RichTextImageNode,
      ListNode,
      ListItemNode,

      LinkNode,
      AutoLinkNode,
      HorizontalRuleNode,
    ],

    onError(
      error
    ) {

      console.error(
        "Lexical editor error",
        error
      );
    },
  };


  return (
    <LexicalComposer
      initialConfig={
        initialConfig
      }
    >

      <div
        className=
          "augmis-rte-shell"
      >

        <RichTextToolbar />


        <div
          className=
            "augmis-rte-editor-wrap"

          style={{
            minHeight,
          }}
        >

          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className=
                  "augmis-rte-editor"

                style={{
                  minHeight,
                }}
              />
            }

            placeholder={
              <div
                className=
                  "augmis-rte-placeholder"
              >
                Enter content...
              </div>
            }

            ErrorBoundary={
              LexicalErrorBoundary
            }
          />


          <HistoryPlugin />

          <ListPlugin />

          <LinkPlugin />
            <RichTextImagePlugin />

          <InitialHtmlPlugin
            html={
              value
            }
          />


          <OnChangePlugin
            onChange={(
              editorState,
              editor
            ) => {

              editorState.read(
                () => {

                  const html =
                    $generateHtmlFromNodes(
                      editor,
                      null
                    );


                  onChange?.(
                    html
                  );
                }
              );
            }}
          />

        </div>

      </div>

    </LexicalComposer>
  );
}