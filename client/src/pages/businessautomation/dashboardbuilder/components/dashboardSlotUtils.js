/* ============================================================================
   AUGMIS DASHBOARD SLOT UTILITIES
============================================================================ */


/* ============================================================================
   NORMALIZE SLOT ID

   Supports both:

   { id: "bottom-1" }

   and:

   { slotId: "bottom-1" }
============================================================================ */

function getSlotId(
  slot
) {

  return String(
    slot?.slotId ||
    slot?.id ||
    ""
  ).trim();
}


/* ============================================================================
   NORMALIZE ACCEPTED COMPONENT TYPES
============================================================================ */

function getSlotAccepts(
  slot
) {

  if (
    Array.isArray(
      slot?.accepts
    )
  ) {

    return slot.accepts
      .map(
        (item) =>
          String(item || "")
            .trim()
            .toLowerCase()
      )
      .filter(Boolean);
  }


  return String(
    slot?.accepts ||
    ""
  )
    .split(",")
    .map(
      (item) =>
        item
          .trim()
          .toLowerCase()
    )
    .filter(Boolean);
}


/* ============================================================================
   GET CONSUMED SLOT IDS

   Example:

   bottom-1 = {
     type: "crud",

     layout: {
       span: 2,

       mergedSlots: [
         "bottom-2"
       ]
     }
   }

   bottom-2 is therefore consumed and must not behave as an independent
   available dashboard slot.
============================================================================ */

export function getConsumedSlotIds(
  components = {}
) {

  const consumed =
    new Set();


  Object.values(
    components || {}
  ).forEach(
    (component) => {

      const mergedSlots =
        component?.layout
          ?.mergedSlots;


      if (
        !Array.isArray(
          mergedSlots
        )
      ) {
        return;
      }


      mergedSlots.forEach(
        (slotId) => {

          const normalizedSlotId =
            String(
              slotId ||
              ""
            ).trim();


          if (
            normalizedSlotId
          ) {

            consumed.add(
              normalizedSlotId
            );
          }
        }
      );
    }
  );


  return consumed;
}


/* ============================================================================
   FIND NEXT COMPATIBLE SLOT

   Merge rules:

   1. Current slot must exist in the ordered slot list.
   2. Only the immediately adjacent slot on the right is considered.
   3. Adjacent slot must be empty.
   4. Adjacent slot must not already be consumed by another merged component.
   5. Adjacent slot must support the current component type.
============================================================================ */
export function findNextCompatibleSlot({
  slots = [],
  currentSlotId,
  componentType,
  components = {},
}) {

  const normalizedSlots =
    Array.isArray(slots)
      ? slots
      : [];


  const getSlotId = (
    slot
  ) =>
    String(
      slot?.slotId ||
      slot?.id ||
      ""
    ).trim();


  const getAccepts = (
    slot
  ) => {

    if (
      Array.isArray(
        slot?.accepts
      )
    ) {

      return slot.accepts
        .map(
          (item) =>
            String(item || "")
              .trim()
              .toLowerCase()
        )
        .filter(Boolean);
    }


    return String(
      slot?.accepts ||
      ""
    )
      .split(",")
      .map(
        (item) =>
          item
            .trim()
            .toLowerCase()
      )
      .filter(Boolean);
  };


  const currentId =
    String(
      currentSlotId ||
      ""
    ).trim();


  const normalizedType =
    String(
      componentType ||
      ""
    )
      .trim()
      .toLowerCase();


  const currentIndex =
    normalizedSlots.findIndex(
      (slot) =>
        getSlotId(slot) ===
        currentId
    );


  if (
    currentIndex < 0
  ) {
    return null;
  }


  /*
   * IMPORTANT:
   *
   * If this component already spans slots,
   * start looking AFTER its current span.
   *
   * Example:
   *
   * bottom-1 spans bottom-2
   *
   * next candidate must therefore be
   * bottom-3.
   */
  const currentComponent =
    components?.[
      currentId
    ] ||
    {};


  const currentSpan =
    Math.max(
      1,
      Number(
        currentComponent
          ?.layout
          ?.span ||
        1
      )
    );


  const candidateIndex =
    currentIndex +
    currentSpan;


  if (
    candidateIndex >=
    normalizedSlots.length
  ) {
    return null;
  }


  const nextSlot =
    normalizedSlots[
      candidateIndex
    ];


  const nextSlotId =
    getSlotId(
      nextSlot
    );


  if (
    !nextSlotId
  ) {
    return null;
  }


  /*
   * Destination already occupied.
   */
  if (
    components?.[
      nextSlotId
    ]
  ) {
    return null;
  }


  /*
   * Destination already consumed
   * by some OTHER merge.
   */
  const consumed =
    getConsumedSlotIds(
      components
    );


  if (
    consumed.has(
      nextSlotId
    )
  ) {
    return null;
  }


  const accepts =
    getAccepts(
      nextSlot
    );


  if (
    accepts.length &&
    !accepts.includes(
      normalizedType
    )
  ) {
    return null;
  }


  return {
    slotId:
      nextSlotId,

    accepts,
  };
}


