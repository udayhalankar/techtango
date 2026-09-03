// server/routes/dashboardbuilder.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function normalizeLayoutDefinition(layoutDefinition) {
  if (!layoutDefinition) return layoutDefinition || {};
  if (typeof layoutDefinition === "string") {
    try {
      return JSON.parse(layoutDefinition);
    } catch {
      const trimmed = layoutDefinition.trim();
      if (trimmed.startsWith("<")) {
        return { html: layoutDefinition };
      }
      return {};
    }
  }
  return layoutDefinition;
}

async function ensureDashboardTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboardbuilder (
      id BIGSERIAL PRIMARY KEY,
      dbtable_id JSONB,
      page_name TEXT,
      page_url TEXT,
      status TEXT DEFAULT 'Active',
      validations JSONB DEFAULT '{}'::jsonb,
      access JSONB DEFAULT '{}'::jsonb,
      details JSONB DEFAULT '{}'::jsonb,
      create_edit TEXT,
      description TEXT,
      created_by BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      modified_by BIGINT,
      date_modified TIMESTAMPTZ,
      tenant_id JSONB DEFAULT '[]'::jsonb,
      layout JSONB DEFAULT '{}'::jsonb,
      builder_type VARCHAR(50) NOT NULL DEFAULT 'dashboard'
    );
  `);

  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS dbtable_id JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS page_name TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS page_url TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS status TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS validations JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS access JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS details JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS create_edit TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS description TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS created_by BIGINT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS modified_by BIGINT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS date_modified TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS tenant_id JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS layout JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS builder_type VARCHAR(50) NOT NULL DEFAULT 'dashboard';`);
}

async function getTenantId(userId) {
  const q = await pool.query(`SELECT tenant FROM users WHERE id=$1`, [userId]);
  return q.rows[0]?.tenant ?? null;
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/", async (req, res) => {

  try {

    await ensureDashboardTable();


    const builderType =
  String(
    req.query?.builderType ||
    "dashboard"
  )
    .trim()
    .toLowerCase();


    const { rows } =
      await pool.query(
        `
        SELECT
          id,
          page_name,
          description,
          page_url,
          status,
          created_by,
          date_created,
          date_modified,
          builder_type
        FROM dashboardbuilder
        WHERE builder_type = $1
        ORDER BY id DESC
        `,
        [
          builderType,
        ]
      );


    res.json(
      rows
    );

  } catch (e) {

    res
      .status(500)
      .json({
        error:
          e.message,
      });
  }
});

router.post(
  "/:id/component-chart-data",

  async (req, res) => {

    try {

      const tableName =
        String(
          req.body
            ?.tableName ||
          ""
        ).trim();


      const xAxis =
        String(
          req.body
            ?.xAxis ||
          ""
        ).trim();


      const yAxis =
        String(
          req.body
            ?.yAxis ||
          ""
        ).trim();


      const aggregation =
        String(
          req.body
            ?.aggregation ||
          "actual"
        )
          .trim()
          .toLowerCase();


      /* =========================================================
         SECURITY
      ========================================================= */

      if (
        !/^cust_[a-zA-Z0-9_]+$/.test(
          tableName
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid table name",
          });
      }


      if (
        !/^[a-zA-Z0-9_]+$/.test(
          xAxis
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid X-Axis column",
          });
      }


      if (
        !/^[a-zA-Z0-9_]+$/.test(
          yAxis
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid Y-Axis column",
          });
      }


      const allowedAggregations =
        [
          "actual",
          "count",
          "sum",
          "avg",
          "min",
          "max",
        ];


      if (
        !allowedAggregations.includes(
          aggregation
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid aggregation",
          });
      }


      let sql;


      /* =========================================================
         RAW / ACTUAL VALUES
      ========================================================= */

      if (
        aggregation ===
        "actual"
      ) {

        sql =
          `
          SELECT
            "${xAxis}" AS label,
            "${yAxis}" AS value
          FROM "${tableName}"
          WHERE "${xAxis}" IS NOT NULL
          ORDER BY "${xAxis}"
          `;
      }


      /* =========================================================
         COUNT
      ========================================================= */

      else if (
        aggregation ===
        "count"
      ) {

        sql =
          `
          SELECT
            "${xAxis}" AS label,
            COUNT(*)::numeric AS value
          FROM "${tableName}"
          WHERE "${xAxis}" IS NOT NULL
          GROUP BY "${xAxis}"
          ORDER BY "${xAxis}"
          `;
      }


      /* =========================================================
         SUM / AVG / MIN / MAX
      ========================================================= */

      else {

        sql =
          `
          SELECT
            "${xAxis}" AS label,
            ${aggregation.toUpperCase()}
            ("${yAxis}")::numeric
              AS value
          FROM "${tableName}"
          WHERE "${xAxis}" IS NOT NULL
          GROUP BY "${xAxis}"
          ORDER BY "${xAxis}"
          `;
      }


      const result =
        await pool.query(
          sql
        );


      res.json({
        labels:
          result.rows.map(
            (row) =>
              row.label
          ),

        values:
          result.rows.map(
            (row) => {

              const numeric =
                Number(
                  row.value
                );


              return Number.isFinite(
                numeric
              )
                ? numeric
                : row.value;
            }
          ),
      });

    } catch (err) {

      console.error(
        "Component chart data error",
        err
      );


      res.status(500).json({
        error:
          err.message,
      });
    }
  }
);

router.get("/:id", async (req, res) => {
  try {
    await ensureDashboardTable();
    const builderType =
  req.query?.builderType
    ? String(
        req.query.builderType
      )
        .trim()
        .toLowerCase()
    : null;


let query;
let params;


if (builderType) {

  query = `
    SELECT *
    FROM dashboardbuilder
    WHERE id = $1
      AND builder_type = $2
  `;

  params = [
    req.params.id,
    builderType,
  ];

} else {

  query = `
    SELECT *
    FROM dashboardbuilder
    WHERE id = $1
  `;

  params = [
    req.params.id,
  ];
}


const { rows } =
  await pool.query(
    query,
    params
  );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id/chart-data", async (req, res) => {
  try {
    await ensureDashboardTable();
    const { rows } = await pool.query(
      `SELECT id, layout, dbtable_id FROM dashboardbuilder WHERE id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });

    const layout = rows[0]?.layout || {};
    const layoutIndex = Number(req.query?.layoutIndex ?? 0);
    let charts = Array.isArray(layout?.charts) ? layout.charts : [];
    if (Number.isFinite(layoutIndex) && layoutIndex > 0) {
      const extras = Array.isArray(layout?.meta?.additionalLayouts)
        ? layout.meta.additionalLayouts
        : [];
      const selected = extras[layoutIndex - 1];
      charts = Array.isArray(selected?.charts) ? selected.charts : [];
    }
    const results = [];

    for (const chart of charts) {
      const tableName = String(chart?.tableName || "");
      const chartType = chart?.chartType || "";
      const chartName = chart?.chartName || "";
      const xAxis = String(chart?.xAxis || "");
      const yAxis = String(chart?.yAxis || "");
      const aggregation = String(chart?.aggregation || "actual");
      if (!tableName || !IDENT.test(tableName)) {
        results.push({
          tableName,
          chartType,
          chartName,
          labels: [],
          values: [],
          error: "Invalid table",
        });
        continue;
      }

      if (xAxis && !IDENT.test(xAxis)) {
        results.push({ tableName, chartType, chartName, labels: [], values: [], error: "Invalid xAxis" });
        continue;
      }
      if (yAxis && !IDENT.test(yAxis)) {
        results.push({ tableName, chartType, chartName, labels: [], values: [], error: "Invalid yAxis" });
        continue;
      }

      let labels = [];
      let values = [];

      if (xAxis && (yAxis || aggregation === "count")) {
        const cols = await pool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2::text[])`,
          [tableName, yAxis ? [xAxis, yAxis] : [xAxis]]
        );
        const found = new Set(cols.rows.map((c) => c.column_name));
        if (!found.has(xAxis) || (yAxis && !found.has(yAxis))) {
          results.push({
            tableName,
            chartType,
            chartName,
            labels: [],
            values: [],
            error: "Axis column not found",
          });
          continue;
        }
        try {
          if (aggregation === "count") {
            const data = await pool.query(
              `SELECT "${xAxis}" AS x, COUNT(*)::int AS y
               FROM "${tableName}"
               GROUP BY x
               ORDER BY x
               LIMIT 7`
            );
            labels = data.rows.map((r) => (r.x ?? "").toString());
            values = data.rows.map((r) => Number(r.y ?? 0));
          } else if (aggregation === "avg" || aggregation === "sum") {
            const fn = aggregation === "avg" ? "AVG" : "SUM";
            const data = await pool.query(
              `SELECT "${xAxis}" AS x, ${fn}(("${yAxis}")::numeric) AS y
               FROM "${tableName}"
               GROUP BY x
               ORDER BY x
               LIMIT 7`
            );
            labels = data.rows.map((r) => (r.x ?? "").toString());
            values = data.rows.map((r) => Number(r.y ?? 0));
          } else {
            const data = await pool.query(
              `SELECT "${xAxis}" AS x, "${yAxis}" AS y
               FROM "${tableName}"
               ORDER BY id DESC
               LIMIT 7`
            );
            const rowsAsc = [...data.rows].reverse();
            labels = rowsAsc.map((r) => (r.x ?? "").toString());
            values = rowsAsc.map((r) => Number(r.y ?? 0));
          }
        } catch (e) {
          results.push({
            tableName,
            chartType,
            chartName,
            labels: [],
            values: [],
            error: "Aggregation error",
          });
          continue;
        }
      } else {
        const hasDate = await pool.query(
          `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='date_created'`,
          [tableName]
        );
        if (!hasDate.rows.length) {
          results.push({
            tableName,
            chartType,
            chartName,
            labels: [],
            values: [],
            error: "date_created column not found",
          });
          continue;
        }

        const data = await pool.query(
          `SELECT date_created::date AS day, COUNT(*)::int AS count
           FROM "${tableName}"
           GROUP BY day
           ORDER BY day DESC
           LIMIT 7`
        );

        const rowsAsc = [...data.rows].reverse();
        labels = rowsAsc.map((r) =>
          r.day ? new Date(r.day).toISOString().slice(0, 10) : ""
        );
        values = rowsAsc.map((r) => Number(r.count || 0));
      }

      results.push({ tableName, chartType, chartName, labels, values, aggregation });
    }

    res.json({ charts: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.post(
  "/:id/kpi-data",
  async (req, res) => {

    try {

      const tableName =
        String(
          req.body?.tableName ||
          ""
        ).trim();


      const aggregation =
        String(
          req.body?.aggregation ||
          "count"
        )
          .trim()
          .toLowerCase();


      const valueColumn =
        String(
          req.body?.valueColumn ||
          ""
        ).trim();


      /* =========================================================
         VALIDATE TABLE
      ========================================================= */

      if (
        !/^cust_[a-zA-Z0-9_]+$/.test(
          tableName
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid table name",
          });
      }


      const allowedAggregations = [
        "count",
        "count_values",
        "sum",
        "avg",
        "min",
        "max",
      ];


      if (
        !allowedAggregations.includes(
          aggregation
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid aggregation",
          });
      }


      /*
       * Only calculations other than
       * Count Records require a column.
       */

      if (
        aggregation !== "count" &&
        !/^[a-zA-Z0-9_]+$/.test(
          valueColumn
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid value column",
          });
      }


      let sql;


      /* =========================================================
         COUNT ALL RECORDS
      ========================================================= */

      if (
        aggregation ===
        "count"
      ) {

        sql = `
          SELECT
            COUNT(*)::numeric
              AS value
          FROM "${tableName}"
        `;
      }


      /* =========================================================
         COUNT NON-NULL FIELD VALUES
      ========================================================= */

      else if (
        aggregation ===
        "count_values"
      ) {

        sql = `
          SELECT
            COUNT("${valueColumn}")::numeric
              AS value
          FROM "${tableName}"
        `;
      }


      /* =========================================================
         OTHER AGGREGATIONS
      ========================================================= */

      else {

        sql = `
          SELECT
            ${aggregation.toUpperCase()}
            ("${valueColumn}")::numeric
              AS value
          FROM "${tableName}"
        `;
      }


      const result =
        await pool.query(
          sql
        );


      const rawValue =
        result.rows?.[0]
          ?.value;


      res.json({
        value:
          rawValue === null ||
          rawValue === undefined
            ? null
            : Number(rawValue),
      });

    } catch (err) {

      console.error(
        "KPI DATA ERROR:",
        err
      );


      res.status(500).json({
        error:
          err.message,
      });
    }
  }
);


router.post(
  "/:id/component-table-data",

  async (req, res) => {

    try {

      const tableName =
        String(
          req.body?.tableName ||
          ""
        ).trim();


      const selectedColumns =
        Array.isArray(
          req.body
            ?.selectedColumns
        )
          ? req.body
              .selectedColumns
              .map(
                (column) =>
                  String(
                    column
                  ).trim()
              )
              .filter(Boolean)
          : [];


      const search =
        String(
          req.body?.search ||
          ""
        ).trim();


      const sortColumn =
        String(
          req.body?.sortColumn ||
          ""
        ).trim();


      const sortDirection =
        String(
          req.body?.sortDirection ||
          "asc"
        )
          .trim()
          .toLowerCase();


      const page =
        Math.max(
          Number(
            req.body?.page ||
            0
          ),
          0
        );


      /*
       * The configured Rows to Display
       * becomes the page size.
       */
      const pageSize =
        Math.min(
          Math.max(
            Number(
              req.body?.pageSize ||
              req.body?.rowLimit ||
              10
            ),
            1
          ),
          100
        );


      /* =========================================================
         VALIDATION
      ========================================================= */

      if (
        !/^cust_[a-zA-Z0-9_]+$/.test(
          tableName
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid table name",
          });
      }


      if (
        !selectedColumns.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "At least one column is required",
          });
      }


      const invalidColumn =
        selectedColumns.some(
          (column) =>
            !IDENT.test(
              column
            )
        );


      if (
        invalidColumn
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid column",
          });
      }


      /*
       * Runtime sorting is restricted
       * to columns already selected
       * for this table component.
       */
      if (
        sortColumn &&
        (
          !IDENT.test(
            sortColumn
          ) ||
          !selectedColumns.includes(
            sortColumn
          )
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid sort column",
          });
      }


      const direction =
        sortDirection ===
        "desc"
          ? "DESC"
          : "ASC";


      const columnSql =
        selectedColumns
          .map(
            (column) =>
              `"${column}"`
          )
          .join(", ");


      /* =========================================================
         SEARCH
      ========================================================= */

      const params =
        [];


      let whereSql =
        "";


      if (
        search
      ) {

        params.push(
          `%${search}%`
        );


        const searchParam =
          `$${params.length}`;


        whereSql =
          `
          WHERE (
            ${selectedColumns
              .map(
                (column) =>
                  `COALESCE("${column}"::text, '') ILIKE ${searchParam}`
              )
              .join(
                " OR "
              )}
          )
          `;
      }


      /* =========================================================
         TOTAL COUNT
      ========================================================= */

      const countResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int
              AS total
          FROM "${tableName}"
          ${whereSql}
          `,
          params
        );


      const totalRows =
        Number(
          countResult
            ?.rows?.[0]
            ?.total ||
          0
        );


      /* =========================================================
         DATA QUERY
      ========================================================= */

      const offset =
        page *
        pageSize;


      let sql =
        `
        SELECT
          ${columnSql}
        FROM "${tableName}"
        ${whereSql}
        `;


      if (
        sortColumn
      ) {

        sql +=
          `
          ORDER BY
            "${sortColumn}"
            ${direction}
          `;
      }


      sql +=
        `
        LIMIT ${pageSize}
        OFFSET ${offset}
        `;


      const result =
        await pool.query(
          sql,
          params
        );


      res.json({
        columns:
          selectedColumns,

        rows:
          result.rows,

        totalRows,

        page,

        pageSize,
      });

    } catch (err) {

      console.error(
        "Component table data error",
        err
      );


      res.status(500).json({
        error:
          err.message,
      });
    }
  }
);

router.post("/", async (req, res) => {
  const {
  pageName,
  description,
  layout,
  dbtableId,
  status,
  pageUrl,
  builderType = "dashboard",
} = req.body || {};

const normalizedBuilderType =
  String(
    builderType ||
    "dashboard"
  )
    .trim()
    .toLowerCase();

    const allowedBuilderTypes = [
  "dashboard",
  "enterpriseexperiencebuilder",
];


if (
  !allowedBuilderTypes.includes(
    normalizedBuilderType
  )
) {

  return res
    .status(400)
    .json({
      error:
        "Invalid builderType",
    });
}


  const userId = req.user?.id || null;

  if (!pageName) {
    return res.status(400).json({ error: "pageName is required" });
  }
  if (!layout) {
    return res.status(400).json({ error: "layout is required" });
  }
  if (
  normalizedBuilderType ===
    "dashboard" &&
  !dbtableId
) {

  return res
    .status(400)
    .json({
      error:
        "dbtableId is required for dashboard",
    });
}

  const parsedLayout = typeof layout === "string" ? JSON.parse(layout) : layout;
  const parsedDbtableId =
  typeof dbtableId ===
  "string"
    ? JSON.parse(
        dbtableId
      )
    : dbtableId ||
      [];

  try {
    await ensureDashboardTable();
    const tenantId = userId ? await getTenantId(userId) : null;
    const tenantList = tenantId ? [tenantId] : [];
    const normalizedLayout =
          normalizedBuilderType ===
          "dashboard"
            ? {
                ...(parsedLayout || {}),

                layoutDefinition:
                  normalizeLayoutDefinition(
                    parsedLayout?.layoutDefinition
                  ),
              }
            : {
                ...(parsedLayout || {}),
              };
    const layoutJson = JSON.stringify(normalizedLayout || {});
    const dbtableJson = JSON.stringify(parsedDbtableId || []);
    const tenantJson = JSON.stringify(tenantList);

    const { rows } = await pool.query(
      `INSERT INTO dashboardbuilder
(
  page_name,
  description,
  layout,
  dbtable_id,
  page_url,
  status,
  created_by,
  tenant_id,
  builder_type
)
VALUES (
  $1,
  $2,
  $3::jsonb,
  $4::jsonb,
  $5,
  $6,
  $7,
  $8::jsonb,
  $9
)
RETURNING
  id,
  page_name,
  description,
  layout,
  dbtable_id,
  page_url,
  status,
  created_by,
  date_created,
  builder_type`,
      [
        pageName,
        description || null,
        layoutJson,
        dbtableJson,
        pageUrl || null,
        status || "Active",
        userId,
        tenantJson,
        normalizedBuilderType,
      ]
    );

    let row = rows[0];
    if (!row.page_url) {
      const url =
        normalizedBuilderType ===
        "enterpriseexperiencebuilder"
          ? `/enterpriseexperience/${row.id}`
          : `/dashboardbuilder/${row.id}`;
      const upd = await pool.query(
        `UPDATE dashboardbuilder SET page_url=$1 WHERE id=$2
         RETURNING id, page_name, description, layout, dbtable_id, page_url, status, created_by, date_created, builder_type`,
        [url, row.id]
      );
      row = upd.rows[0];
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// router.put("/:id", async (req, res) => {

//   try {

//     await ensureDashboardTable();

//     const {
//       layout,
//       pageName,
//       description,
//       status,
//       builderType,
//     } = req.body || {};


//     if (!layout) {

//       return res
//         .status(400)
//         .json({
//           error:
//             "layout is required",
//         });
//     }


//     const userId =
//       req.user?.id ||
//       null;


//     /*
//      * builderType is optional so the existing
//      * Dashboard Builder PUT calls continue to work.
//      *
//      * If supplied, however, validate it.
//      */
//     let normalizedBuilderType =
//       null;


//     if (builderType) {

//       normalizedBuilderType =
//         String(
//           builderType
//         )
//           .trim()
//           .toLowerCase();


//       const allowedBuilderTypes = [
//         "dashboard",
//         "enterpriseexperiencebuilder",
//       ];


//       if (
//         !allowedBuilderTypes.includes(
//           normalizedBuilderType
//         )
//       ) {

//         return res
//           .status(400)
//           .json({
//             error:
//               "Invalid builderType",
//           });
//       }
//     }


//     const normalizedLayout =
//           normalizedBuilderType ===
//           "enterpriseexperiencebuilder"
//             ? {
//                 ...(layout || {}),
//               }
//             : {
//                 ...(layout || {}),

//                 layoutDefinition:
//                   normalizeLayoutDefinition(
//                     layout?.layoutDefinition
//                   ),
//               };


//     const layoutJson =
//       JSON.stringify(
//         normalizedLayout ||
//         {}
//       );


//     const { rows } =
//       await pool.query(
//         `
//         UPDATE dashboardbuilder
//         SET
//           layout = $1::jsonb,

//           page_name =
//             COALESCE(
//               $2,
//               page_name
//             ),

//           description =
//             COALESCE(
//               $3,
//               description
//             ),

//           status =
//             COALESCE(
//               $4,
//               status
//             ),

//           modified_by = $5,

//           date_modified = now()

//         WHERE id = $6

//           AND (
//             $7::text IS NULL
//             OR builder_type = $7
//           )

//         RETURNING
//           id,
//           page_name,
//           description,
//           layout,
//           dbtable_id,
//           page_url,
//           status,
//           created_by,
//           date_created,
//           modified_by,
//           date_modified,
//           builder_type
//         `,
//         [
//           layoutJson,
//           pageName ?? null,
//           description ?? null,
//           status ?? null,
//           userId,
//           req.params.id,
//           normalizedBuilderType,
//         ]
//       );


//     if (!rows.length) {

//       return res
//         .status(404)
//         .json({
//           error:
//             "Builder page not found or builder type does not match",
//         });
//     }


//     res.json(
//       rows[0]
//     );

//   } catch (e) {

//     console.error(
//       "Dashboard Builder update error:",
//       e
//     );


//     res
//       .status(500)
//       .json({
//         error:
//           e.message,
//       });
//   }
// });



router.put("/:id", async (req, res) => {

  try {

    await ensureDashboardTable();


    const {
      layout,
      pageName,
      description,
      status,
      builderType,
    } =
      req.body || {};


    if (!layout) {

      return res
        .status(400)
        .json({
          error:
            "layout is required",
        });
    }


    const userId =
      req.user?.id ||
      null;


    let normalizedBuilderType =
      null;


    if (
      builderType
    ) {

      normalizedBuilderType =
        String(
          builderType
        )
          .trim()
          .toLowerCase();


      const allowedBuilderTypes = [
        "dashboard",
        "enterpriseexperiencebuilder",
      ];


      if (
        !allowedBuilderTypes.includes(
          normalizedBuilderType
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid builderType",
          });
      }
    }


    /*
     * Enterprise Experience does not need
     * dashboard layoutDefinition.
     */
    const normalizedLayout =
      normalizedBuilderType ===
      "enterpriseexperiencebuilder"
        ? {
            ...(layout || {}),
          }
        : {
            ...(layout || {}),

            layoutDefinition:
              normalizeLayoutDefinition(
                layout
                  ?.layoutDefinition
              ),
          };


    const layoutJson =
      JSON.stringify(
        normalizedLayout ||
        {}
      );


    const { rows } =
      await pool.query(
        `
        UPDATE dashboardbuilder

        SET
          layout =
            $1::jsonb,

          page_name =
            COALESCE(
              $2,
              page_name
            ),

          description =
            COALESCE(
              $3,
              description
            ),

          status =
            COALESCE(
              $4,
              status
            ),

          modified_by =
            $5,

          date_modified =
            now()

        WHERE id =
          $6

          AND (
            $7::text IS NULL
            OR builder_type =
               $7
          )

        RETURNING
          id,
          page_name,
          description,
          layout,
          dbtable_id,
          page_url,
          status,
          created_by,
          date_created,
          modified_by,
          date_modified,
          builder_type
        `,
        [
          layoutJson,
          pageName ?? null,
          description ?? null,
          status ?? null,
          userId,
          req.params.id,
          normalizedBuilderType,
        ]
      );


    if (
      !rows.length
    ) {

      return res
        .status(404)
        .json({
          error:
            "Builder page not found or builder type does not match",
        });
    }


    res.json(
      rows[0]
    );

  } catch (e) {

    console.error(
      "Dashboard Builder update error:",
      e
    );


    res
      .status(500)
      .json({
        error:
          e.message,
      });
  }
});



router.delete("/:id", async (req, res) => {
  try {
    await ensureDashboardTable();
    const { rows } = await pool.query(
      `DELETE FROM dashboardbuilder
       WHERE id=$1
       RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
