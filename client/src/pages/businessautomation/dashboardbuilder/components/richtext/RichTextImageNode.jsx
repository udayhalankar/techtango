import React from "react";

import {
  $applyNodeReplacement,
  $getNodeByKey,
  DecoratorNode,
} from "lexical";

import {
  useLexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";
/* ==========================================================================
   IMAGE COMPONENT
========================================================================== */

function RichTextImageComponent({
  src,
  altText,
  width,
  nodeKey,
}) {

  const [
    editor,
  ] =
    useLexicalComposerContext();


  const [
    currentWidth,
    setCurrentWidth,
  ] = React.useState(
    width || 500
  );


  const resizingRef =
    React.useRef(false);


  const startXRef =
    React.useRef(0);


  const startWidthRef =
    React.useRef(
      currentWidth
    );


  const handleMouseDown =
    (
      event
    ) => {

      event.preventDefault();

      event.stopPropagation();


      resizingRef.current =
        true;


      startXRef.current =
        event.clientX;


      startWidthRef.current =
        currentWidth;


      document.body.style.userSelect =
        "none";


      window.addEventListener(
        "mousemove",
        handleMouseMove
      );


      window.addEventListener(
        "mouseup",
        handleMouseUp
      );
    };


  const handleMouseMove =
    (
      event
    ) => {

      if (
        !resizingRef.current
      ) {
        return;
      }


      const delta =
        event.clientX -
        startXRef.current;


      let newWidth =
        startWidthRef.current +
        delta;


      const minWidth =
        80;


      const maxWidth =
        1200;


      newWidth =
        Math.max(
          minWidth,

          Math.min(
            maxWidth,
            newWidth
          )
        );


      setCurrentWidth(
        newWidth
      );
    };


  const handleMouseUp =
    () => {

      if (
        !resizingRef.current
      ) {
        return;
      }


      resizingRef.current =
        false;


      document.body.style.userSelect =
        "";


      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );


      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );


      editor.update(
        () => {

          const node =
            $getNodeByKey(
              nodeKey
            );


          if (
            $isRichTextImageNode(
              node
            )
          ) {

            node.setWidth(
              currentWidth
            );
          }
        }
      );
    };


  React.useEffect(
    () => {

      setCurrentWidth(
        width || 500
      );

    },
    [
      width,
    ]
  );


  React.useEffect(
    () => {

      return () => {

        window.removeEventListener(
          "mousemove",
          handleMouseMove
        );


        window.removeEventListener(
          "mouseup",
          handleMouseUp
        );


        document.body.style.userSelect =
          "";
      };

    },
    []
  );


  return (
    <div
      className=
        "augmis-rte-image-wrapper"

      style={{
        width:
          `${currentWidth}px`,

        maxWidth:
          "100%",

        position:
          "relative",

        display:
          "inline-block",

        margin:
          "10px 0",
      }}
    >

      <img
        src={
          src
        }

        alt={
          altText || ""
        }

        style={{
          display:
            "block",

          width:
            "100%",

          height:
            "auto",

          maxWidth:
            "100%",

          borderRadius:
            "4px",
        }}

        draggable={
          false
        }
      />


      <div
        className=
          "augmis-rte-image-resize-handle"

        onMouseDown={
          handleMouseDown
        }
      />

    </div>
  );
}


/* ==========================================================================
   IMAGE NODE
========================================================================== */

export class RichTextImageNode
  extends DecoratorNode {

  __src;

  __altText;

  __width;


  static getType() {

    return "augmis-image";
  }


  static clone(
    node
  ) {

    return new RichTextImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__key
    );
  }


  constructor(
    src,
    altText = "",
    width = null,
    key
  ) {

    super(
      key
    );


    this.__src =
      src;


    this.__altText =
      altText;


    this.__width =
      width;
  }


  /* ========================================================================
     DOM WRAPPER USED INSIDE LEXICAL
  ======================================================================== */

  createDOM() {

    const element =
      document.createElement(
        "span"
      );


    element.className =
      "augmis-rte-image-node";


    return element;
  }


  updateDOM() {

    return false;
  }


  /* ========================================================================
     BLOCK NODE

     Image behaves as its own block rather than inline text.
  ======================================================================== */

  isInline() {

    return false;
  }


  /* ========================================================================
     SERIALIZATION - LEXICAL JSON
  ======================================================================== */

  static importJSON(
    serializedNode
  ) {

    const {
      src,
      altText,
      width,
    } =
      serializedNode;


    return $createRichTextImageNode({
      src,
      altText,
      width,
    });
  }


  exportJSON() {

    return {
      ...super.exportJSON(),

      type:
        "augmis-image",

      version:
        1,

      src:
        this.__src,

      altText:
        this.__altText,

      width:
        this.__width,
    };
  }


  /* ========================================================================
     HTML EXPORT

     IMPORTANT:
     Your AUGMIS text component is persisted as HTML.

     Therefore images MUST export to a normal <img>.
  ======================================================================== */

  exportDOM() {

    const image =
      document.createElement(
        "img"
      );


    image.setAttribute(
      "src",
      this.__src
    );


    image.setAttribute(
      "alt",
      this.__altText || ""
    );


    if (
      this.__width
    ) {

      image.setAttribute(
        "width",
        String(
          this.__width
        )
      );
    }


    image.style.maxWidth =
      "100%";


    image.style.height =
      "auto";


    image.style.display =
      "block";


    image.style.margin =
      "10px 0";


    return {
      element:
        image,
    };
  }


  /* ========================================================================
     HTML IMPORT

     Required when Configure opens saved HTML again.

     <img> from saved HTML becomes RichTextImageNode.
  ======================================================================== */

  static importDOM() {

    return {

      img:
        () => ({
          conversion:
            convertImageElement,

          priority:
            1,
        }),

    };
  }


  /* ========================================================================
     GETTERS
  ======================================================================== */

  getSrc() {

    return this
      .getLatest()
      .__src;
  }


  getAltText() {

    return this
      .getLatest()
      .__altText;
  }


  getWidth() {

    return this
      .getLatest()
      .__width;
  }

  setWidth(
  width
) {

  const writable =
    this.getWritable();


  writable.__width =
    width;
}

  /* ========================================================================
     RENDER
  ======================================================================== */

  decorate() {

  return (
    <RichTextImageComponent
      src={
        this.__src
      }

      altText={
        this.__altText
      }

      width={
        this.__width
      }

      nodeKey={
        this.getKey()
      }
    />
  );
}
}


/* ==========================================================================
   HTML → LEXICAL CONVERSION
========================================================================== */

function convertImageElement(
  domNode
) {

  if (
    !(
      domNode instanceof
      HTMLImageElement
    )
  ) {

    return null;
  }


  const src =
    domNode.getAttribute(
      "src"
    );


  if (!src) {

    return null;
  }


  const altText =
    domNode.getAttribute(
      "alt"
    ) || "";


  const widthAttribute =
    domNode.getAttribute(
      "width"
    );


  const parsedWidth =
    widthAttribute
      ? Number(
          widthAttribute
        )
      : null;


  const node =
    $createRichTextImageNode({
      src,

      altText,

      width:
        Number.isFinite(
          parsedWidth
        )
          ? parsedWidth
          : null,
    });


  return {
    node,
  };
}


/* ==========================================================================
   FACTORY
========================================================================== */

export function $createRichTextImageNode({
  src,
  altText = "",
  width = null,
}) {

  return $applyNodeReplacement(
    new RichTextImageNode(
      src,
      altText,
      width
    )
  );
}


/* ==========================================================================
   TYPE GUARD
========================================================================== */

export function $isRichTextImageNode(
  node
) {

  return (
    node instanceof
    RichTextImageNode
  );
}