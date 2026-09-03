import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AddComponentModal from
  "../../dashboardbuilder/components/AddComponentModal";

import KpiConfigModal from
  "../../dashboardbuilder/components/KpiConfigModal";

import ChartConfigModal from
  "../../dashboardbuilder/components/ChartConfigModal";

import TableConfigModal from
  "../../dashboardbuilder/components/TableConfigModal";

import CrudConfigModal from
  "../../dashboardbuilder/components/CrudConfigModal";

import TextConfigModal from
  "../../dashboardbuilder/components/TextConfigModal";

import MediaConfigModal from
  "../../dashboardbuilder/components/MediaConfigModal";

import DashboardComponentRenderer from
  "../../dashboardbuilder/components/DashboardComponentRenderer";

import api from
  "../../../../services/api";


export default function useExperienceComponentLayer({
  experience,
  onExperienceChange,

  activeSlot,
  addComponentOpen,

  onCloseAddComponent,

  onSetActiveSlot,
}) {

  /* ============================================================
     CONFIG MODAL STATE
  ============================================================ */

  const [
    kpiConfigOpen,
    setKpiConfigOpen,
  ] = useState(false);


  const [
    chartConfigOpen,
    setChartConfigOpen,
  ] = useState(false);


  const [
    tableConfigOpen,
    setTableConfigOpen,
  ] = useState(false);


  const [
    crudConfigOpen,
    setCrudConfigOpen,
  ] = useState(false);


  const [
    textConfigOpen,
    setTextConfigOpen,
  ] = useState(false);


  const [
    mediaConfigOpen,
    setMediaConfigOpen,
  ] = useState(false);


  /* ============================================================
     DATA-SOURCE CONFIGURATION DATA
  ============================================================ */

  const [
    tables,
    setTables,
  ] = useState([]);


  const [
    columnsByTable,
    setColumnsByTable,
  ] = useState({});


  const [
    crudPages,
    setCrudPages,
  ] = useState([]);

  const [
    kpiData,
    setKpiData,
  ] =
    useState({});





  const [
    kpiLoading,
    setKpiLoading,
  ] =
    useState({});


  const [
    chartData,
    setChartData,
  ] =
    useState({});


    /*
 * Existing Dashboard Builder data routes currently
 * require :id in the URL but do not use that id
 * when executing KPI / Chart / Table data queries.
 *
 * Use the Experience ID when available; otherwise
 * use a stable temporary context identifier.
 */
const componentDataContextId =
  experience?.id ||
  "enterprise-experience";


  const components =
    experience?.components ||
    {};


  /* ============================================================
     LOAD TABLES + CRUD PAGES

     Same sources used by DashboardViewer.
  ============================================================ */

  useEffect(() => {

    let cancelled =
      false;


    const loadConfigurationSources =
      async () => {

        try {

          const [
            tablesResponse,
            crudResponse,
          ] =
            await Promise.all([
              api.get(
                "/crudpages/db/meta/tables"
              ),

              api.get(
                "/crudpages"
              ),
            ]);


          if (cancelled) {
            return;
          }


          const allTables =
            Array.isArray(
              tablesResponse?.data
            )
              ? tablesResponse.data
              : [];


          setTables(
            allTables.filter(
              (tableName) =>
                String(
                  tableName
                )
                  .toLowerCase()
                  .startsWith(
                    "cust_"
                  )
            )
          );


          setCrudPages(
            Array.isArray(
              crudResponse?.data
            )
              ? crudResponse.data
              : []
          );

        } catch (error) {

          console.error(
            "Enterprise Experience: failed to load component configuration sources",
            error
          );


          if (!cancelled) {
            setTables([]);
            setCrudPages([]);
          }
        }
      };


    loadConfigurationSources();


    return () => {
      cancelled =
        true;
    };

  }, []);


  /* ============================================================
   KPI DATA

   Reuses the existing Dashboard Builder KPI data service.
============================================================ */

useEffect(() => {

  let cancelled =
    false;


  const loadKpis =
    async () => {

      const entries =
        Object.entries(
          components ||
          {}
        ).filter(
          ([
            ,
            component,
          ]) =>
            component?.type ===
            "kpi"
        );


      if (
        !entries.length
      ) {

        setKpiData(
          {}
        );

        setKpiLoading(
          {}
        );

        return;
      }


      setKpiLoading(
        Object.fromEntries(
          entries.map(
            ([
              slotId,
            ]) => [
              slotId,
              true,
            ]
          )
        )
      );


      const results =
        await Promise.all(

          entries.map(
            async ([
              slotId,
              component,
            ]) => {

              try {

                const source =
                  component
                    ?.dataSource ||
                  {};


                const response =
                  await api.post(
                    `/dashboardbuilder/${componentDataContextId}/kpi-data`,
                    {
                      tableName:
                        source
                          .tableName,

                      aggregation:
                        source
                          .aggregation,

                      valueColumn:
                        source
                          .valueColumn,
                    }
                  );


                return [
                  slotId,

                  response
                    ?.data
                    ?.value ??
                  null,
                ];

              } catch (
                error
              ) {

                console.error(
                  `Enterprise Experience KPI load failed: ${slotId}`,
                  error
                );


                return [
                  slotId,
                  null,
                ];
              }
            }
          )
        );


      if (
        cancelled
      ) {
        return;
      }


      setKpiData(
        Object.fromEntries(
          results
        )
      );


      setKpiLoading(
        {}
      );
    };


  loadKpis();


  return () => {

    cancelled =
      true;
  };

}, [
  components,
  componentDataContextId,
]);




/* ============================================================
   CHART DATA

   Reuses existing Dashboard Builder chart service.
============================================================ */

useEffect(() => {

  let cancelled =
    false;


  const loadCharts =
    async () => {

      const entries =
        Object.entries(
          components ||
          {}
        ).filter(
          ([
            ,
            component,
          ]) =>
            component?.type ===
            "chart"
        );


      if (
        !entries.length
      ) {

        setChartData(
          {}
        );

        return;
      }


      const results =
        await Promise.all(

          entries.map(
            async ([
              slotId,
              component,
            ]) => {

              try {

                const source =
                  component
                    ?.dataSource ||
                  {};


                const response =
                  await api.post(
                    `/dashboardbuilder/${componentDataContextId}/component-chart-data`,
                    {
                      tableName:
                        source
                          .tableName,

                      xAxis:
                        source
                          .xAxis,

                      yAxis:
                        source
                          .yAxis,

                      aggregation:
                        source
                          .aggregation,
                    }
                  );


                return [
                  slotId,

                  {
                    labels:
                      response
                        ?.data
                        ?.labels ||
                      [],

                    values:
                      response
                        ?.data
                        ?.values ||
                      [],
                  },
                ];

              } catch (
                error
              ) {

                console.error(
                  `Enterprise Experience chart load failed: ${slotId}`,
                  error
                );


                return [
                  slotId,

                  {
                    labels:
                      [],

                    values:
                      [],
                  },
                ];
              }
            }
          )
        );


      if (
        cancelled
      ) {
        return;
      }


      setChartData(
        Object.fromEntries(
          results
        )
      );
    };


  loadCharts();


  return () => {

    cancelled =
      true;
  };

}, [
  components,
  componentDataContextId,
]);


  /* ============================================================
     LOAD COLUMNS

     Reuses the same endpoint as Dashboard Viewer.
  ============================================================ */

  const loadColumns =
    useCallback(
      async (
        tableName
      ) => {

        if (!tableName) {
          return;
        }


        if (
          columnsByTable[
            tableName
          ]
        ) {
          return;
        }


        try {

          const response =
            await api.get(
              `/db/columns/${tableName}`
            );


          const columns =
            response?.data
              ?.columns ||
            [];


          setColumnsByTable(
            (current) => ({
              ...current,

              [tableName]:
                columns,
            })
          );

        } catch (error) {

          console.error(
            `Failed loading columns for ${tableName}`,
            error
          );


          setColumnsByTable(
            (current) => ({
              ...current,

              [tableName]:
                [],
            })
          );
        }
      },

      [
        columnsByTable,
      ]
    );


  /* ============================================================
     CURRENT COMPONENT
  ============================================================ */

  const activeComponent =
    activeSlot?.slotId
      ? components[
          activeSlot.slotId
        ]
      : null;


  /* ============================================================
     COMMON SAVE

     IMPORTANT:
     Preserve component.layout because Merge Right metadata lives
     there.
  ============================================================ */

  const saveComponent =
    useCallback(
      (
        component,
        slot
      ) => {

        const slotId =
          slot?.slotId;


        if (!slotId) {
          return;
        }


        const existing =
          components[
            slotId
          ];


        const nextComponent = {
          ...component,

          layout:
            component?.layout ||
            existing?.layout || {
              span: 1,
              mergedSlots: [],
            },
        };


        onExperienceChange?.({
          ...experience,

          components: {
            ...components,

            [slotId]:
              nextComponent,
          },
        });


        setKpiConfigOpen(
          false
        );

        setChartConfigOpen(
          false
        );

        setTableConfigOpen(
          false
        );

        setCrudConfigOpen(
          false
        );

        setTextConfigOpen(
          false
        );

        setMediaConfigOpen(
          false
        );


        onSetActiveSlot?.(
          null
        );
      },

      [
        components,
        experience,
        onExperienceChange,
        onSetActiveSlot,
      ]
    );


  /* ============================================================
     CLOSE CONFIG
  ============================================================ */

  const closeConfiguration =
    () => {

      setKpiConfigOpen(
        false
      );

      setChartConfigOpen(
        false
      );

      setTableConfigOpen(
        false
      );

      setCrudConfigOpen(
        false
      );

      setTextConfigOpen(
        false
      );

      setMediaConfigOpen(
        false
      );


      onSetActiveSlot?.(
        null
      );
    };


  /* ============================================================
     OPEN CONFIG FOR COMPONENT TYPE
  ============================================================ */

  const openConfiguration =
    useCallback(
      (
        componentType
      ) => {

        switch (
          componentType
        ) {

          case "kpi":

            setKpiConfigOpen(
              true
            );

            break;


          case "chart":

            setChartConfigOpen(
              true
            );

            break;


          case "table":

            setTableConfigOpen(
              true
            );

            break;


          case "crud":

            setCrudConfigOpen(
              true
            );

            break;


          case "text":

            setTextConfigOpen(
              true
            );

            break;


          case "media":

            setMediaConfigOpen(
              true
            );

            break;


          default:

            console.warn(
              "Unsupported Enterprise Experience component:",
              componentType
            );
        }
      },

      []
    );


  /* ============================================================
     ADD COMPONENT SELECTION
  ============================================================ */

  const handleComponentSelect =
    (
      componentType,
      slot
    ) => {

      onCloseAddComponent?.(
        false
      );


      onSetActiveSlot?.(
        slot
      );


      openConfiguration(
        componentType
      );
    };


  /* ============================================================
     FIND ROW FOR SLOT
  ============================================================ */

  const findRowForSlot =
    useCallback(
      (
        slotId
      ) => {

        return (
          experience
            ?.rows ||
          []
        ).find(
          (
            row
          ) =>
            (
              row?.slots ||
              []
            ).some(
              (
                slot
              ) =>
                slot.slotId ===
                slotId
            )
        );
      },

      [
        experience
          ?.rows,
      ]
    );


  /* ============================================================
     CONSUMED SLOT IDS
  ============================================================ */

  const consumedSlotIds =
    useMemo(
      () => {

        const result =
          new Set();


        Object.values(
          components
        ).forEach(
          (
            component
          ) => {

            const merged =
              component
                ?.layout
                ?.mergedSlots;


            if (
              Array.isArray(
                merged
              )
            ) {

              merged.forEach(
                (
                  slotId
                ) =>
                  result.add(
                    slotId
                  )
              );
            }
          }
        );


        return result;
      },

      [
        components,
      ]
    );


  /* ============================================================
     NEXT MERGE SLOT

     IMPORTANT:
     Merge is restricted to the same row.
     We DO NOT merge across rows.
  ============================================================ */

  const findNextMergeSlot =
    useCallback(
      (
        slotId,
        component
      ) => {

        const row =
          findRowForSlot(
            slotId
          );


        if (!row) {
          return null;
        }


        const slots =
          row?.slots ||
          [];


        const currentIndex =
          slots.findIndex(
            (
              slot
            ) =>
              slot.slotId ===
              slotId
          );


        if (
          currentIndex < 0
        ) {
          return null;
        }


        /*
         * Find the first physical slot to the right
         * that is not already consumed by THIS component.
         */

        const ownMerged =
          Array.isArray(
            component
              ?.layout
              ?.mergedSlots
          )
            ? component
                .layout
                .mergedSlots
            : [];


        let candidateIndex =
          currentIndex + 1;


        while (
          candidateIndex <
          slots.length
        ) {

          const candidate =
            slots[
              candidateIndex
            ];


          /*
           * Already part of current component:
           * continue farther right.
           */
          if (
            ownMerged.includes(
              candidate.slotId
            )
          ) {

            candidateIndex +=
              1;

            continue;
          }


          /*
           * Occupied by another component.
           */
          if (
            components[
              candidate.slotId
            ]
          ) {
            return null;
          }


          /*
           * Consumed by another merge.
           */
          if (
            consumedSlotIds.has(
              candidate.slotId
            )
          ) {
            return null;
          }


          /*
           * Component must also be permitted
           * in destination slot.
           */

          const accepted =
            Array.isArray(
              candidate.accepts
            )
              ? candidate.accepts
              : [];


          const compatibilityType =
            component?.type ===
            "media"
              ? "image"
              : component?.type;


          if (
            accepted.length &&
            !accepted.includes(
              compatibilityType
            )
          ) {
            return null;
          }


          return candidate;
        }


        return null;
      },

      [
        components,
        consumedSlotIds,
        findRowForSlot,
      ]
    );


  /* ============================================================
     MERGE RIGHT
  ============================================================ */

  const mergeRight =
    useCallback(
      (
        slotId
      ) => {

        const component =
          components[
            slotId
          ];


        if (!component) {
          return;
        }


        const nextSlot =
          findNextMergeSlot(
            slotId,
            component
          );


        if (!nextSlot) {
          return;
        }


        const existingMerged =
          Array.isArray(
            component
              ?.layout
              ?.mergedSlots
          )
            ? component
                .layout
                .mergedSlots
            : [];


        const nextComponent = {
          ...component,

          layout: {
            ...(
              component
                ?.layout ||
              {}
            ),

            span:
              Number(
                component
                  ?.layout
                  ?.span ||
                1
              ) + 1,

            mergedSlots: [
              ...existingMerged,

              nextSlot.slotId,
            ],
          },
        };


        onExperienceChange?.({
          ...experience,

          components: {
            ...components,

            [slotId]:
              nextComponent,
          },
        });
      },

      [
        components,
        experience,
        findNextMergeSlot,
        onExperienceChange,
      ]
    );


  /* ============================================================
     REMOVE

     When component is removed its mergedSlots metadata disappears.
     ExperienceRow will therefore show those slots again.
  ============================================================ */

  const removeComponent =
    useCallback(
      (
        slotId
      ) => {

        const nextComponents = {
          ...components,
        };


        delete nextComponents[
          slotId
        ];


        onExperienceChange?.({
          ...experience,

          components:
            nextComponents,
        });
      },

      [
        components,
        experience,
        onExperienceChange,
      ]
    );


  /* ============================================================
     CONFIGURE
  ============================================================ */

  const configureComponent =
  useCallback(
    (
      slot
    ) => {

      const component =
        components[
          slot?.slotId
        ];


      if (
        !component
      ) {
        return;
      }


      onSetActiveSlot?.(
        slot
      );


      openConfiguration(
        component.type
      );
    },

    [
      components,
      onSetActiveSlot,
      openConfiguration,
    ]
  );


  /* ============================================================
     RENDER FUNCTION

     This is passed back to EnterpriseExperienceBuilder.
  ============================================================ */

  const renderComponent =
    useCallback(
      (
        component,
        slot
      ) => {

        const nextMergeSlot =
          findNextMergeSlot(
            slot.slotId,
            component
          );


        return (
          <DashboardComponentRenderer
              component={
                component
              }

              dashboardId={
                componentDataContextId
              }

              value={
                kpiData[
                  slot.slotId
                ]
              }

              data={
                chartData[
                  slot.slotId
                ]
              }

              loading={
                Boolean(
                  kpiLoading[
                    slot.slotId
                  ]
                )
              }

            onConfigure={() =>
              configureComponent(
                slot
              )
            }

            onDuplicate={() => {
              /*
               * We will wire duplicate after
               * Merge/Remove validation.
               */
              console.log(
                "Duplicate component:",
                slot.slotId
              );
            }}

            canMergeRight={
              Boolean(
                nextMergeSlot
              )
            }

            onMergeRight={() =>
              mergeRight(
                slot.slotId
              )
            }

            onRemove={() =>
              removeComponent(
                slot.slotId
              )
            }
          />
        );
      },

      [
         findNextMergeSlot,

          mergeRight,

          removeComponent,

          configureComponent,

          componentDataContextId,

          kpiData,

          chartData,

          kpiLoading,
      ]
    );


  return {
    renderComponent,
    consumedSlotIds,

    modals: (
      <>

        {/* ======================================================
            ADD COMPONENT
        ====================================================== */}

        <AddComponentModal
          open={
            addComponentOpen
          }

          slot={
            activeSlot
          }

          onClose={() => {

            onCloseAddComponent?.(
              false
            );

            onSetActiveSlot?.(
              null
            );
          }}

          onSelect={
            handleComponentSelect
          }
        />


        {/* ======================================================
            KPI
        ====================================================== */}

        <KpiConfigModal
          open={
            kpiConfigOpen
          }

          slot={
            activeSlot
          }

          tables={
            tables
          }

          columnsByTable={
            columnsByTable
          }

          loadColumns={
            loadColumns
          }

          initialConfig={
            activeComponent
          }

          onClose={
            closeConfiguration
          }

          onSave={
            saveComponent
          }
        />


        {/* ======================================================
            CHART
        ====================================================== */}

        <ChartConfigModal
          open={
            chartConfigOpen
          }

          slot={
            activeSlot
          }

          tables={
            tables
          }

          columnsByTable={
            columnsByTable
          }

          loadColumns={
            loadColumns
          }

          initialConfig={
            activeComponent
          }

          onClose={
            closeConfiguration
          }

          onSave={
            saveComponent
          }
        />


        {/* ======================================================
            TABLE
        ====================================================== */}

        <TableConfigModal
          open={
            tableConfigOpen
          }

          slot={
            activeSlot
          }

          tables={
            tables
          }

          columnsByTable={
            columnsByTable
          }

          loadColumns={
            loadColumns
          }

          initialConfig={
            activeComponent
          }

          onClose={
            closeConfiguration
          }

          onSave={
            saveComponent
          }
        />


        {/* ======================================================
            CRUD
        ====================================================== */}

        <CrudConfigModal
          open={
            crudConfigOpen
          }

          slot={
            activeSlot
          }

          pages={
            crudPages
          }

          initialConfig={
            activeComponent
          }

          onClose={
            closeConfiguration
          }

          onSave={
            saveComponent
          }
        />


        {/* ======================================================
            MEDIA
        ====================================================== */}

        <MediaConfigModal
          open={
            mediaConfigOpen
          }

          slot={
            activeSlot
          }

          initialConfig={
            activeComponent
          }

          onClose={
            closeConfiguration
          }

          onSave={
            saveComponent
          }
        />


        {/* ======================================================
            TEXT
        ====================================================== */}

        <TextConfigModal
          open={
            textConfigOpen
          }

          slot={
            activeSlot
          }

          initialConfig={
            activeComponent
          }

          onClose={
            closeConfiguration
          }

          onSave={
            saveComponent
          }
        />

      </>
    ),
  };
}