export const ROW_TYPES = [
  {
    value: "kpi",
    label: "KPI Row",
    description:
      "Performance indicators and summary metrics",
  },

  {
    value: "data",
    label: "Data / CRUD Row",
    description:
      "CRUD applications and data tables",
  },

  {
    value: "chart",
    label: "Chart Row",
    description:
      "Charts and analytical visualisations",
  },

  {
    value: "content",
    label: "Content Row",
    description:
      "Text, images and media",
  },

  {
    value: "mixed",
    label: "Mixed Row",
    description:
      "Combine different component types",
  },

  {
    value: "ai",
    label: "AI Row",
    description:
      "AI chat and intelligent assistant components",
  },

  {
    value: "custom",
    label: "Custom Row",
    description:
      "Choose any available component",
  },
];


export const ROW_LAYOUTS = [
  {
    id: "12",
    label: "Full Width",
    columns: [12],
  },

  {
    id: "6-6",
    label: "Two Equal",
    columns: [6, 6],
  },

  {
    id: "8-4",
    label: "Wide Left",
    columns: [8, 4],
  },

  {
    id: "4-8",
    label: "Wide Right",
    columns: [4, 8],
  },

  {
    id: "4-4-4",
    label: "Three Equal",
    columns: [4, 4, 4],
  },

  {
    id: "3-3-3-3",
    label: "Four Equal",
    columns: [3, 3, 3, 3],
  },

  {
    id: "2-2-2-2-2-2",
    label: "Six Equal",
    columns: [
      2,
      2,
      2,
      2,
      2,
      2,
    ],
  },
];


export const KPI_LAYOUTS = [
  {
    id: "1",
    label: "1 KPI",
    columns: [12],
  },

  {
    id: "2",
    label: "2 KPIs",
    columns: [6, 6],
  },

  {
    id: "3",
    label: "3 KPIs",
    columns: [4, 4, 4],
  },

  {
    id: "4",
    label: "4 KPIs",
    columns: [
      3,
      3,
      3,
      3,
    ],
  },

  {
    id: "6",
    label: "6 KPIs",
    columns: [
      2,
      2,
      2,
      2,
      2,
      2,
    ],
  },
];


export const ACCEPTS_BY_ROW_TYPE = {
  kpi: [
    "kpi",
  ],

  data: [
    "crud",
    "table",
  ],

  chart: [
    "chart",
  ],

  content: [
    "text",
    "image",
  ],

  mixed: [
    "kpi",
    "crud",
    "table",
    "chart",
    "text",
    "image",
    "ai-chat",
  ],

  ai: [
    "ai-chat",
  ],

  custom: [
    "kpi",
    "crud",
    "table",
    "chart",
    "text",
    "image",
    "ai-chat",
  ],
};