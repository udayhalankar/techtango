// simpleWorkflowFormLayouts.js
//
// Helper for building/storing layout_def JSON for form views.
// - 3 sections: header, main, footer
// - Each section has up to 4 columns
// - Columns can be stretched/merged via `span` (1..4) -> 12-grid widths
//   span=1 => md=3, span=2 => md=6, span=3 => md=9, span=4 => md=12

export const SECTION_IDS = ["header", "main", "footer"];

// Ensure 4 columns with ids col1..col4 and optional span
function createEmptyColumns(spanPattern = [1, 1, 1, 1]) {
  const cols = [];
  for (let i = 0; i < 4; i += 1) {
    cols.push({
      id: `col${i + 1}`,
      span: spanPattern[i] ?? 1,
      fields: [],
    });
  }
  return cols;
}

// Very basic classifier – you can refine later if needed
function classifyField(r) {
  const col = String(r.column || "").toLowerCase();
  const t = String(r.input_type || r.data_type || "").toLowerCase();

  const isLongText =
    t === "textarea" ||
    /text/.test(t) && /comment|description|remarks|remark|notes?/.test(col);

  const isHeaderish =
    /id$/.test(col) ||
    /^id$/.test(col) ||
    /date/.test(col) ||
    /status/.test(col) ||
    /ref/.test(col);

  return {
    isHeaderish,
    isLongText,
  };
}

/**
 * Build a basic LayoutDefV1 for a preset.
 *
 * @param {Object} opts
 * @param {string} opts.presetKey  "VIEW_1".."VIEW_6"
 * @param {Array}  opts.fields     previewFields from getPreviewFields()
 *
 * Returns:
 * {
 *   version: 1,
 *   kind: "preset",
 *   label_style: "side" | "top",
 *   sections: [ { id, title, columns: [ {id, span, fields:[{field,label_position?}]} ] } ]
 * }
 */
export function buildPresetLayout({ presetKey, fields }) {
  const safeFields = Array.isArray(fields) ? fields : [];
  const key = String(presetKey || "VIEW_2").toUpperCase();

  // Split fields into header/main/footer candidates
  const headerFields = [];
  const mainFields = [];
  const footerFields = [];

  for (const r of safeFields) {
    const { isHeaderish, isLongText } = classifyField(r);
    const colName = String(r.column || "");

    if (isHeaderish && headerFields.length < 8) {
      headerFields.push(colName);
    } else if (isLongText) {
      footerFields.push(colName);
    } else {
      mainFields.push(colName);
    }
  }

  // Helper: spread a list of field names across columns round-robin
  function distribute(list, cols, preferredCols = [0, 1, 2, 3]) {
    if (!list.length) return;
    let idx = 0;
    for (const name of list) {
      const targetIndex = preferredCols[idx % preferredCols.length];
      cols[targetIndex].fields.push({ field: name });
      idx += 1;
    }
  }

  // Decide span pattern + label style per preset
  let labelStyle = "side";
  let headerSpan = [1, 1, 1, 1]; // all 4 small
  let mainSpan = [1, 1, 1, 1];
  let footerSpan = [1, 1, 1, 1];
  let headerColsPref = [0, 1, 2, 3];
  let mainColsPref = [0, 1, 2, 3];
  let footerColsPref = [0];

  switch (key) {
    // Single column – everything stacked
    case "VIEW_1":
      headerSpan = [4, 0, 0, 0]; // 12 grid width
      mainSpan = [4, 0, 0, 0];
      footerSpan = [4, 0, 0, 0];
      headerColsPref = [0];
      mainColsPref = [0];
      footerColsPref = [0];
      break;

    // Two-column business form (2+2 pattern -> effectively col1 & col2 used)
    case "VIEW_2":
      headerSpan = [2, 2, 0, 0]; // 6+6
      mainSpan = [2, 2, 0, 0];   // 6+6
      footerSpan = [4, 0, 0, 0]; // full width comments
      headerColsPref = [0, 1];
      mainColsPref = [0, 1];
      footerColsPref = [0];
      break;

    // Three-column layout (3+1 -> last slim column)
    case "VIEW_3":
      headerSpan = [1, 1, 1, 1]; // header still 4 small
      mainSpan = [3, 1, 1, 1];   // 9+3+0+0 or 9+3+? depending how many used
      footerSpan = [4, 0, 0, 0];
      headerColsPref = [0, 1];
      mainColsPref = [0, 1, 2];
      footerColsPref = [0];
      break;

    // Full 4-column dense
    case "VIEW_4":
      headerSpan = [1, 1, 1, 1];
      mainSpan = [1, 1, 1, 1];
      footerSpan = [4, 0, 0, 0];
      headerColsPref = [0, 1, 2, 3];
      mainColsPref = [0, 1, 2, 3];
      footerColsPref = [0];
      break;

    // Process layout – header 2 cols, main mostly 3 cols
    case "VIEW_5":
      headerSpan = [2, 2, 0, 0]; // 6+6
      mainSpan = [2, 1, 1, 0];   // 6+3+3
      footerSpan = [4, 0, 0, 0];
      headerColsPref = [0, 1];
      mainColsPref = [0, 1, 2];
      footerColsPref = [0];
      break;

    // Mobile-first: top labels
    case "VIEW_6":
      labelStyle = "top";
      headerSpan = [4, 0, 0, 0];
      mainSpan = [2, 2, 0, 0];   // 6+6 on desktop
      footerSpan = [4, 0, 0, 0];
      headerColsPref = [0];
      mainColsPref = [0, 1];
      footerColsPref = [0];
      break;

    default:
      // fallback behaves like VIEW_2
      headerSpan = [2, 2, 0, 0];
      mainSpan = [2, 2, 0, 0];
      footerSpan = [4, 0, 0, 0];
      headerColsPref = [0, 1];
      mainColsPref = [0, 1];
      footerColsPref = [0];
      break;
  }

  const headerCols = createEmptyColumns(headerSpan);
  const mainCols = createEmptyColumns(mainSpan);
  const footerCols = createEmptyColumns(footerSpan);

  distribute(headerFields, headerCols, headerColsPref);
  distribute(mainFields, mainCols, mainColsPref);
  distribute(footerFields, footerCols, footerColsPref);

  const layout = {
    version: 1,
    kind: "preset",
    preset_key: key,
    label_style: labelStyle,
    sections: [
      {
        id: "header",
        title: "Header",
        columns: headerCols,
      },
      {
        id: "main",
        title: "Details",
        columns: mainCols,
      },
      {
        id: "footer",
        title: "Footer",
        columns: footerCols,
      },
    ],
  };

  return layout;
}

/**
 * Utility to turn layout_def + previewFields into a "render-ready" structure.
 * This is optional helper for the Render tab.
 *
 * @param {Object} layoutDef
 * @param {Array} previewFields   array from getPreviewFields()
 *
 * Returns:
 * [
 *   {
 *     id: "header",
 *     title: "...",
 *     columns: [
 *       { id: "col1", span: 1..4, fields: [ { field, fieldMeta, label_position? } ] },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */
export function materializeLayout(layoutDef, previewFields) {
  if (!layoutDef || !Array.isArray(layoutDef.sections)) return null;
  const byName = Object.fromEntries(
    (previewFields || []).map((f) => [String(f.column), f])
  );

  return layoutDef.sections.map((sec) => {
    const cols = Array.isArray(sec.columns) ? sec.columns : [];
    return {
      id: sec.id || "main",
      title: sec.title || null,
      columns: cols.map((col, idx) => {
        const span = Number(col.span || 1);
        const safeSpan = Number.isFinite(span) ? Math.min(Math.max(span, 1), 4) : 1;

        const fields =
          Array.isArray(col.fields) && col.fields.length
            ? col.fields
                .map((fp) => {
                  const fieldName = String(fp.field || "");
                  const meta = byName[fieldName];
                  if (!meta) return null;
                  return {
                    field: fieldName,
                    fieldMeta: meta,
                    label_position: fp.label_position || null,
                  };
                })
                .filter(Boolean)
            : [];

        return {
          id: col.id || `col${idx + 1}`,
          span: safeSpan,
          fields,
          // pass through optional header/footer blocks (render-time elements)
          blocks: Array.isArray(col.blocks) ? col.blocks : [],
        };
      }),
    };
  });
}
