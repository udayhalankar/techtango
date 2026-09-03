/*
===============================================================================
AUGMIS DASHBOARD TEMPLATE
Executive Workspace
Template Key: executive-workspace-v1
===============================================================================

IMPORTANT

This file defines ONLY:

- page structure
- styling
- configurable slots
- placeholder locations

It does NOT contain:

- database data
- chart configuration logic
- API calls
- CRUD logic
- modal logic

Those remain shared across all dashboard templates.
===============================================================================
*/


export const EXECUTIVE_WORKSPACE_KEY =
  "executive-workspace-v1";


/* =============================================================================
   SLOT DEFINITIONS
============================================================================= */

export const executiveWorkspaceSlots = [

  /* ---------------------------------------------------------------------------
     SIDEBAR
  --------------------------------------------------------------------------- */

  {
    id: "sidebar-widget",
    type: "component",
    accepts: [
      "kpi",
      "text",
      "image",
      "widget",
    ],
  },


  /* ---------------------------------------------------------------------------
     KPI ROW
  --------------------------------------------------------------------------- */

  {
    id: "kpi-1",
    type: "component",
    accepts: ["kpi"],
  },

  {
    id: "kpi-2",
    type: "component",
    accepts: ["kpi"],
  },

  {
    id: "kpi-3",
    type: "component",
    accepts: ["kpi"],
  },

  {
    id: "kpi-4",
    type: "component",
    accepts: ["kpi"],
  },

  {
    id: "kpi-5",
    type: "component",
    accepts: ["kpi"],
  },


  /* ---------------------------------------------------------------------------
     ANALYTICS ROW 1
  --------------------------------------------------------------------------- */

  {
    id: "chart-1",
    type: "component",
    accepts: [
      "chart",
      "table",
    ],
  },

  {
    id: "chart-2",
    type: "component",
    accepts: [
      "chart",
      "table",
    ],
  },

  {
    id: "chart-3",
    type: "component",
    accepts: [
      "chart",
      "table",
    ],
  },


  /* ---------------------------------------------------------------------------
     ANALYTICS ROW 2
  --------------------------------------------------------------------------- */

  {
    id: "chart-4",
    type: "component",
    accepts: [
      "chart",
      "table",
    ],
  },

  {
    id: "chart-5",
    type: "component",
    accepts: [
      "chart",
      "table",
    ],
  },

  {
    id: "chart-6",
    type: "component",
    accepts: [
      "chart",
      "table",
    ],
  },


  /* ---------------------------------------------------------------------------
     FLEXIBLE BOTTOM ROW
  --------------------------------------------------------------------------- */

  {
    id: "bottom-1",
    type: "component",
    accepts: [
      "chart",
      "crud",
      "table",
      "list",
      "text",
      "image",
    ],
  },

  {
    id: "bottom-2",
    type: "component",
    accepts: [
      "chart",
      "crud",
      "table",
      "list",
      "text",
      "image",
    ],
  },

  {
    id: "bottom-3",
    type: "component",
    accepts: [
      "chart",
      "crud",
      "table",
      "list",
      "text",
      "image",
    ],
  },
];


/* =============================================================================
   HELPER
   Creates one generic component slot in schema format
============================================================================= */

function createSlot(
  id,
  accepts,
  className = ""
) {

  return {
    type: "element",

    tag: "div",

    props: {
      className:
        `augmis-dashboard-slot ${className}`.trim(),

      "data-slot": id,

      "data-accepts":
        accepts.join(","),

      "data-component-slot":
        "true",
    },

    children: [],
  };
}


/* =============================================================================
   TEMPLATE SCHEMA
============================================================================= */

export const executiveWorkspaceSchema = {

  type: "element",

  tag: "div",

  props: {
    className:
      "augmis-template executive-workspace",
  },


  children: [

    /* =========================================================================
       PAGE SHELL
    ========================================================================= */

    {
      type: "element",

      tag: "div",

      props: {
        className:
          "app executive-app",
      },


      children: [

        /* =====================================================================
           SIDEBAR
        ===================================================================== */

        {
          type: "element",

          tag: "aside",

          props: {
            className:
              "sidebar executive-sidebar",
          },


          children: [

            /* BRAND */

            {
              type: "element",

              tag: "div",

              props: {
                      className: "brand",

                      "data-config-target":
                        "sidebar",
                    },

              children: [

                {
                  type: "text",
                  text:
                    "AUGMIS Business Intelligence",
                },

                {
                  type: "element",

                  tag: "small",

                  props: {},

                  children: [
                    {
                      type: "text",
                      text:
                        "Monitor ESD Process",
                    },
                  ],
                },
              ],
            },


            /* SIDEBAR COMPONENT */

            createSlot(
              "sidebar-widget",

              [
                "kpi",
                "text",
                "image",
                "widget",
              ],

              "sidebar-widget-slot"
            ),


            /* NAVIGATION */

            {
              type: "element",

              tag: "nav",

              props: {
                className: "menu",
              },


              children: [

                "Overview",
                "ESR",
                "ESR Under Evaluation",
                "LUP",
                "GES",
                "KPI",
                "MOC",
                "Active Contracts",
                "Contract Manpower",
                "70% Value Consumed",
                "Expiry less than 2 years",
                "SW / EWO Contracts",

              ].map(
                (label) => ({

                  type: "element",

                  tag: "button",

                  props: {
                    type: "button",
                  },

                  children: [
                    {
                      type: "text",
                      text: label,
                    },
                  ],
                })
              ),
            },
          ],
        },


        /* =====================================================================
           MAIN CONTENT
        ===================================================================== */

        {
          type: "element",

          tag: "main",

          props: {
            className:
              "main executive-main",
          },


          children: [

            /* -----------------------------------------------------------------
               PAGE HEADER
            ----------------------------------------------------------------- */

            {
              type: "element",

              tag: "header",

              props: {
  className:
    "dashboard-page-header",

},


              children: [

                {
  type: "element",

  tag: "div",

  props: {
    className:
      "dashboard-title-block",

    "data-config-target":
      "page",
  },


                  children: [

                    {
                      type: "element",

                      tag: "div",

                      props: {
                        className: "title",
                      },

                      children: [
                        {
                          type: "text",

                          text:
                            "Manager's Dashboard",
                        },
                      ],
                    },


                    {
                      type: "element",

                      tag: "div",

                      props: {
                        className:
                          "subtitle",
                      },

                      children: [
                        {
                          type: "text",

                          text:
                            "Real-time overview of key metrics and performance",
                        },
                      ],
                    },
                  ],
                },


                /* FUTURE HEADER CONTROLS */

                {
                  type: "element",

                  tag: "div",

                  props: {
                    className:
                      "dashboard-header-actions",
                  },

                  children: [

                    {
                      type: "element",

                      tag: "button",

                      props: {
                        type: "button",
                        className:
                          "header-control",
                      },

                      children: [
                        {
                          type: "text",
                          text:
                            "Date Range",
                        },
                      ],
                    },


                    {
                      type: "element",

                      tag: "button",

                      props: {
                        type: "button",
                        className:
                          "header-control",
                      },

                      children: [
                        {
                          type: "text",
                          text:
                            "Filters",
                        },
                      ],
                    },
                  ],
                },
              ],
            },


            /* -----------------------------------------------------------------
               KPI ROW
            ----------------------------------------------------------------- */

            {
              type: "element",

              tag: "section",

              props: {
                className:
                  "executive-kpi-grid",
              },


              children: [

                createSlot(
                  "kpi-1",
                  ["kpi"],
                  "kpi-slot"
                ),

                createSlot(
                  "kpi-2",
                  ["kpi"],
                  "kpi-slot"
                ),

                createSlot(
                  "kpi-3",
                  ["kpi"],
                  "kpi-slot"
                ),

                createSlot(
                  "kpi-4",
                  ["kpi"],
                  "kpi-slot"
                ),

                createSlot(
                  "kpi-5",
                  ["kpi"],
                  "kpi-slot"
                ),
              ],
            },


            /* -----------------------------------------------------------------
               CHART ROW 1
            ----------------------------------------------------------------- */

            {
              type: "element",

              tag: "section",

              props: {
                className:
                  "executive-chart-grid",
              },


              children: [

                createSlot(
                  "chart-1",

                  [
                    "chart",
                    "table",
                  ],

                  "chart-slot chart-card"
                ),

                createSlot(
                  "chart-2",

                  [
                    "chart",
                    "table",
                  ],

                  "chart-slot chart-card"
                ),

                createSlot(
                  "chart-3",

                  [
                    "chart",
                    "table",
                  ],

                  "chart-slot chart-card"
                ),
              ],
            },


            /* -----------------------------------------------------------------
               CHART ROW 2
            ----------------------------------------------------------------- */

            {
              type: "element",

              tag: "section",

              props: {
                className:
                  "executive-chart-grid",
              },


              children: [

                createSlot(
                  "chart-4",

                  [
                    "chart",
                    "table",
                  ],

                  "chart-slot chart-card"
                ),

                createSlot(
                  "chart-5",

                  [
                    "chart",
                    "table",
                  ],

                  "chart-slot chart-card"
                ),

                createSlot(
                  "chart-6",

                  [
                    "chart",
                    "table",
                  ],

                  "chart-slot chart-card"
                ),
              ],
            },


            /* -----------------------------------------------------------------
               BOTTOM FLEXIBLE COMPONENT ROW
            ----------------------------------------------------------------- */

            {
              type: "element",

              tag: "section",

              props: {
                className:
                  "executive-bottom-grid",
              },


              children: [

                createSlot(
                  "bottom-1",

                  [
                    "chart",
                    "crud",
                    "table",
                    "list",
                    "text",
                    "image",
                  ],

                  "bottom-slot"
                ),

                createSlot(
                  "bottom-2",

                  [
                    "chart",
                    "crud",
                    "table",
                    "list",
                    "text",
                    "image",
                  ],

                  "bottom-slot"
                ),

                createSlot(
                  "bottom-3",

                  [
                    "chart",
                    "crud",
                    "table",
                    "list",
                    "text",
                    "image",
                  ],

                  "bottom-slot"
                ),
              ],
            },
          ],
        },
      ],
    },
  ],
};


/* =============================================================================
   TEMPLATE CSS

   Kept separately from schema for easier maintenance.
============================================================================= */

export const executiveWorkspaceCss = `
.executive-workspace {
    width:100%;
    min-width:0;
    min-height:calc(100vh - 65px);

    background:#f8fafc;

    color:#172b4d;

    font-family:
        Inter,
        Arial,
        Helvetica,
        sans-serif;
}

.executive-workspace .brand,
.executive-workspace .dashboard-title-block {
    position: relative;
    overflow: visible;
}

.executive-workspace .brand {
    padding-right: 34px;
}

.executive-workspace .dashboard-title-block {
    padding-right: 38px;
    min-width: 0;
}

    .executive-workspace .brand {
    white-space: normal;
    overflow-wrap: normal;
    word-break: normal;
}


.executive-workspace,
.executive-workspace * {
    box-sizing:border-box;
}


/* ==========================================================================
   SHELL
========================================================================== */

.executive-workspace .executive-app {
    width:100%;

    min-width:0;

    display:grid;

    grid-template-columns:
        minmax(190px,235px)
        minmax(0,1fr);

    background:#f8fafc;
}


/* ==========================================================================
   SIDEBAR
========================================================================== */

.executive-workspace .executive-sidebar {
    min-height:calc(100vh - 65px);

    padding:22px 16px;

    background:#ffffff;

    border-right:1px solid #e1e7ed;
}


.executive-workspace .brand {
    margin-bottom:18px;

    color:#14263b;

    font-size:14px;

    font-weight:700;

    line-height:1.35;
}


.executive-workspace .brand small {
    display:block;

    margin-top:3px;

    color:#77889a;

    font-size:10px;

    font-weight:400;
}


/* ==========================================================================
   SIDEBAR COMPONENT
========================================================================== */

.executive-workspace .sidebar-widget-slot {
    min-height:82px;

    margin-bottom:16px;
}


/* ==========================================================================
   SIDEBAR NAV
========================================================================== */

.executive-workspace .menu {
    display:grid;

    gap:5px;
}


.executive-workspace .menu button {
    width:100%;

    min-height:36px;

    padding:0 11px;

    border:1px solid transparent;

    border-radius:7px;

    background:transparent;

    color:#42576e;

    text-align:left;

    font-size:10.5px;

    font-weight:500;

    cursor:pointer;

    transition:
        background .14s ease,
        border-color .14s ease,
        color .14s ease;
}


.executive-workspace .menu button:first-child {
    background:#eaf3fc;

    border-color:#d2e5f7;

    color:#0a6ed1;

    font-weight:700;
}


.executive-workspace .menu button:hover {
    background:#f4f7fa;

    border-color:#e2e8ee;
}


/* ==========================================================================
   MAIN
========================================================================== */

.executive-workspace .executive-main {
    min-width:0;

    padding:22px 24px 28px;
}


/* ==========================================================================
   PAGE HEADER
========================================================================== */

.executive-workspace .dashboard-page-header {
    display:flex;

    align-items:flex-start;

    justify-content:space-between;

    gap:16px;

    margin-bottom:20px;
}


.executive-workspace .title {
    position:relative;

    color:#13263a;

    font-size:23px;

    font-weight:700;

    line-height:1.2;
}


.executive-workspace .subtitle {
    margin-top:4px;

    color:#728398;

    font-size:11px;

    font-weight:400;
}


.executive-workspace .dashboard-header-actions {
    display:flex;

    gap:8px;
}


.executive-workspace .header-control {
    height:34px;

    padding:0 12px;

    border:1px solid #dbe3ea;

    border-radius:7px;

    background:#ffffff;

    color:#53677b;

    font-size:10.5px;

    cursor:pointer;
}


/* ==========================================================================
   KPI GRID
========================================================================== */

.executive-workspace .executive-kpi-grid {
    display:grid;

    grid-template-columns:
        repeat(5,minmax(0,1fr));

    gap:12px;

    margin-bottom:14px;
}


/* ==========================================================================
   CHART GRID
========================================================================== */

.executive-workspace .executive-chart-grid {
    display:grid;

    grid-template-columns:
        repeat(3,minmax(0,1fr));

    gap:12px;

    margin-bottom:12px;
}


/* ==========================================================================
   BOTTOM GRID
========================================================================== */

.executive-workspace .executive-bottom-grid {
    display:grid;

    grid-template-columns:
        repeat(3,minmax(0,1fr));

    gap:12px;
}


/* ==========================================================================
   GENERIC SLOT
========================================================================== */

.executive-workspace .augmis-dashboard-slot {
    position:relative;

    min-width:0;

    overflow:hidden;

    background:#ffffff;

    border:1px solid #dce4eb;

    border-radius:10px;

    box-shadow:
        0 2px 7px
        rgba(24,45,66,.035);
}


/* KPI SLOT */

.executive-workspace .kpi-slot {
    min-height:104px;
}


/* CHART SLOT */

.executive-workspace .chart-slot {
    min-height:260px;
}


/* BOTTOM SLOT */

.executive-workspace .bottom-slot {
    min-height:175px;
}


/* ==========================================================================
   EMPTY COMPONENT PLACEHOLDER

   DashboardViewer will inject this.
========================================================================== */

.executive-workspace .dashboard-empty-slot {
    position:absolute;

    inset:0;

    display:flex;

    flex-direction:column;

    align-items:center;

    justify-content:center;

    gap:6px;

    padding:14px;

    color:#93a2b1;

    text-align:center;
}


.executive-workspace .dashboard-empty-slot-icon {
    width:30px;

    height:30px;

    display:grid;

    place-items:center;

    border-radius:8px;

    background:#f1f6fa;

    color:#6f879c;

    font-size:16px;
}


.executive-workspace .dashboard-empty-slot-title {
    font-size:10.5px;

    font-weight:600;

    color:#657b8f;
}


.executive-workspace .dashboard-empty-slot-help {
    font-size:9px;

    font-weight:400;

    color:#9aa9b7;
}


/* ==========================================================================
   RESPONSIVE
========================================================================== */

@media(max-width:1200px) {

    .executive-workspace .executive-kpi-grid {
        grid-template-columns:
            repeat(3,minmax(0,1fr));
    }

}


@media(max-width:980px) {

    .executive-workspace .executive-app {
        grid-template-columns:
            minmax(170px,200px)
            minmax(0,1fr);
    }

    .executive-workspace .executive-chart-grid,
    .executive-workspace .executive-bottom-grid {
        grid-template-columns:
            repeat(2,minmax(0,1fr));
    }

}


@media(max-width:720px) {

    .executive-workspace .executive-app {
        grid-template-columns:
            1fr;
    }

    .executive-workspace .executive-sidebar {
        display:none;
    }

    .executive-workspace .executive-main {
        padding:14px;
    }

    .executive-workspace .executive-kpi-grid,
    .executive-workspace .executive-chart-grid,
    .executive-workspace .executive-bottom-grid {
        grid-template-columns:
            1fr;
    }

}
`;


/* =============================================================================
   COMPLETE TEMPLATE DEFINITION
============================================================================= */

/* =============================================================================
   COMPLETE DATABASE LAYOUT DEFINITION
============================================================================= */

export const executiveWorkspaceLayoutDefinition = {
  version: 2,

  templateKey:
    EXECUTIVE_WORKSPACE_KEY,

  name:
    "Executive Workspace",

  templateType:
    "component-layout",

  schema:
    executiveWorkspaceSchema,

  slots:
    executiveWorkspaceSlots,

  css:
    executiveWorkspaceCss,

  /*
   * Component-based templates do not use
   * the old chartSlots mechanism.
   */
  chartSlots: [],
};


/* =============================================================================
   COMPLETE TEMPLATE DEFINITION
============================================================================= */

const ExecutiveWorkspaceTemplate = {
  key:
    EXECUTIVE_WORKSPACE_KEY,

  name:
    "Executive Workspace",

  description:
    "Executive dashboard with sidebar navigation, KPI strip, six analytics panels and three flexible component areas.",

  version: 2,

  schema:
    executiveWorkspaceSchema,

  slots:
    executiveWorkspaceSlots,

  css:
    executiveWorkspaceCss,

  layoutDefinition:
    executiveWorkspaceLayoutDefinition,
};


export default ExecutiveWorkspaceTemplate;