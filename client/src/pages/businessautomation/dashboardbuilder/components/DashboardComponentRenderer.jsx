//DashboardComponentRenderer.jsx
import React, {
  useEffect,
  useRef,
} from "react";

import {
  Box,  
  Typography,
} from "@mui/material";

import DashboardTextComponent from
  "./DashboardTextComponent";

import DashboardMediaComponent from
  "./DashboardMediaComponent";

import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";

import Chart from "chart.js/auto";
import DashboardComponentMenu from
  "./DashboardComponentMenu";

import DashboardCrudComponent from
  "./DashboardCrudComponent";

import DashboardTableComponent from
  "./DashboardTableComponent";



function formatKpiValue(
  value,
  config
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }


  const numeric =
    Number(value);


  const decimals =
    Number(
      config?.format
        ?.decimalPlaces ??
      0
    );


  const formatted =
    Number.isFinite(
      numeric
    )
      ? numeric.toLocaleString(
          undefined,
          {
            minimumFractionDigits:
              decimals,

            maximumFractionDigits:
              decimals,
          }
        )
      : String(value);


  const prefix =
    config?.format
      ?.prefix ||
    "";


  const suffix =
    config?.format
      ?.suffix ||
    "";


  return [
    prefix,
    formatted,
    suffix,
  ]
    .filter(Boolean)
    .join(
      prefix || suffix
        ? " "
        : ""
    );
}


function KpiComponent({
  component,
  value,
  loading,
  onConfigure,
  onDuplicate,
  onMergeRight,
  canMergeRight,
  onRemove,
}) {

  return (
    <Box
      sx={{
        position:
          "relative",

        width:
          "100%",

        height:
          "100%",

        minHeight:
          100,

        px: 1.5,
        py: 1.35,

        display:
          "flex",

        alignItems:
          "center",

        gap: 1.2,
      }}
    >

      {/* ICON */}

      <Box
        sx={{
          width: 38,
          height: 38,

          flex:
            "0 0 auto",

          display:
            "grid",

          placeItems:
            "center",

          borderRadius:
            "10px",

          bgcolor:
            "#eaf3fc",

          color:
            "#0a74d7",
        }}
      >
        <SpeedOutlinedIcon
          sx={{
            fontSize: 21,
          }}
        />
      </Box>


      {/* VALUE */}

      <Box
        sx={{
          minWidth: 0,

          flex: 1,
        }}
      >

        <Typography
          noWrap

          sx={{
            fontSize:
              10.5,

            fontWeight:
              500,

            color:
              "#728398",
          }}
        >
          {
            component?.title ||
            "KPI"
          }
        </Typography>


        <Typography
          noWrap

          sx={{
            mt: 0.15,

            fontSize:
              22,

            lineHeight:
              1.15,

            fontWeight:
              700,

            color:
              "#172b4d",
          }}
        >
          {loading
            ? "..."
            : formatKpiValue(
                value,
                component
              )}
        </Typography>

      </Box>


      {/* CONFIGURE */}

      {onConfigure && (

        <Box
  sx={{
    position: "absolute",
    top: 4,
    right: 4,
  }}
>
  <DashboardComponentMenu
    onConfigure={
      onConfigure
    }

    onDuplicate={
      onDuplicate
    }

     onMergeRight={
    onMergeRight
  }

  canMergeRight={
    canMergeRight
  }

    onRemove={
      onRemove
    }
  />
</Box>

        

      )}

    </Box>
  );
}

function ChartComponent({
  component,
  data,
  onConfigure,
  onDuplicate,
  onMergeRight,
  canMergeRight,
  onRemove,
}) {

  const canvasRef =
    useRef(null);


  const chartRef =
    useRef(null);


  useEffect(() => {

    if (
      chartRef.current
    ) {

      chartRef.current.destroy();

      chartRef.current =
        null;
    }


    if (
      !canvasRef.current ||
      !Array.isArray(
        data?.labels
      ) ||
      !Array.isArray(
        data?.values
      )
    ) {
      return;
    }


    const typeMap = {
      Bar: "bar",

      "H. Bar":
        "bar",

      Line:
        "line",

      Pie:
        "pie",

      Doughnut:
        "doughnut",
    };


    const chartType =
      typeMap[
        component?.chartType
      ] ||
      "bar";


    const isHorizontal =
      component?.chartType ===
      "H. Bar";


    const isCircular =
      component?.chartType ===
        "Pie" ||
      component?.chartType ===
        "Doughnut";


    chartRef.current =
      new Chart(
        canvasRef.current,

        {
          type:
            chartType,

          data: {
            labels:
              data.labels,

            datasets: [
              {
                label:
                  component?.title ||
                  "Dataset",

                data:
                  data.values,
              },
            ],
          },

          options: {
            responsive:
              true,

            maintainAspectRatio:
              false,

            indexAxis:
              isHorizontal
                ? "y"
                : "x",

            plugins: {
              legend: {
                display:
                  isCircular,
              },
            },

            scales:
              isCircular
                ? {}
                : {
                    x: {
                      grid: {
                        display:
                          false,
                      },

                      ticks: {
                        color:
                          "#6f8193",

                        font: {
                          size: 9,
                        },
                      },
                    },

                    y: {
                      beginAtZero:
                        true,

                      ticks: {
                        color:
                          "#6f8193",

                        font: {
                          size: 9,
                        },
                      },

                      grid: {
                        color:
                          "#edf1f4",
                      },
                    },
                  },
          },
        }
      );


    return () => {

      if (
        chartRef.current
      ) {

        chartRef.current.destroy();

        chartRef.current =
          null;
      }
    };

  }, [
    component,
    data,
  ]);


  return (
    <Box
      sx={{
        position:
          "relative",

        width:
          "100%",

        height:
          "100%",

        minHeight:
          220,

        p: 1.4,

        display:
          "flex",

        flexDirection:
          "column",
      }}
    >

      <Box
        sx={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          minHeight: 28,

          mb: 0.5,
        }}
      >

        <Typography
          noWrap

          sx={{
            fontSize: 11.5,

            fontWeight: 600,

            color:
              "#40566d",
          }}
        >
          {component?.title ||
            "Chart"}
        </Typography>


        {(
            onConfigure ||
            onDuplicate ||
            onRemove
          ) && (

           <Box
  sx={{
    flex: "0 0 auto",
  }}
>
  <DashboardComponentMenu
    onConfigure={
      onConfigure
    }

    onDuplicate={
      onDuplicate
    }

     onMergeRight={
    onMergeRight
  }

  canMergeRight={
    canMergeRight
  }

    onRemove={
      onRemove
    }
  />
</Box>
       

        )}

      </Box>


      <Box
        sx={{
          flex: 1,

          minHeight: 0,

          position:
            "relative",
        }}
      >

        {data?.labels?.length ? (

          <canvas
            ref={
              canvasRef
            }
          />

        ) : (

          <Box
            sx={{
              height:
                "100%",

              display:
                "grid",

              placeItems:
                "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 10,

                color:
                  "#97a6b5",
              }}
            >
              No chart data
            </Typography>
          </Box>
        )}

      </Box>

    </Box>
  );
}


function CrudComponent({
  component,

  onConfigure,
  onDuplicate,

  onMergeRight,
  canMergeRight,

  onRemove,
}) {

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        minHeight: 220,

        display: "flex",

        flexDirection:
          "column",

        overflow:
          "hidden",
      }}
    >

      {/* HEADER */}

      <Box
        sx={{
          minHeight: 31,

          px: 1.2,
          pt: 0.8,

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",
        }}
      >

        <Typography
          noWrap

          sx={{
            minWidth: 0,

            flex: 1,

            fontSize: 11.5,

            fontWeight: 600,

            color:
              "#40566d",
          }}
        >
          {component?.title ||
            "CRUD App"}
        </Typography>


        <DashboardComponentMenu
          onConfigure={
            onConfigure
          }

          onDuplicate={
            onDuplicate
          }

          onMergeRight={
            onMergeRight
          }

          canMergeRight={
            canMergeRight
          }

          onRemove={
            onRemove
          }
        />

      </Box>


      <Box
        sx={{
          flex: 1,

          minHeight: 0,
        }}
      >

        <DashboardCrudComponent
          component={
            component
          }
        />

      </Box>

    </Box>
  );
}


function TableComponent({
  component,
  dashboardId,

  onConfigure,
  onDuplicate,

  onMergeRight,
  canMergeRight,

  onRemove,
}) {

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        minHeight: 220,

        p: 1.3,

        display: "flex",

        flexDirection:
          "column",

        overflow:
          "hidden",
      }}
    >

      <Box
        sx={{
          minHeight: 28,

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          mb: 0.6,
        }}
      >

        <Typography
          noWrap

          sx={{
            minWidth: 0,

            flex: 1,

            fontSize: 11.5,

            fontWeight: 600,

            color:
              "#40566d",
          }}
        >
          {component?.title ||
            "Table"}
        </Typography>


        <DashboardComponentMenu
          onConfigure={
            onConfigure
          }

          onDuplicate={
            onDuplicate
          }

          onMergeRight={
            onMergeRight
          }

          canMergeRight={
            canMergeRight
          }

          onRemove={
            onRemove
          }
        />

      </Box>


      <Box
        sx={{
          flex: 1,

          minHeight: 0,
        }}
      >

        <DashboardTableComponent
          dashboardId={
            dashboardId
          }

          component={
            component
          }
        />

      </Box>

    </Box>
  );
}


function MediaComponent({
  component,

  onConfigure,
  onDuplicate,

  onMergeRight,
  canMergeRight,

  onRemove,
}) {

  return (
    <Box
      sx={{
        position:
          "relative",

        width:
          "100%",

        height:
          "100%",

        minHeight:
          220,

        display:
          "flex",

        flexDirection:
          "column",

        overflow:
          "hidden",
      }}
    >

      {/* HEADER */}

      <Box
        sx={{
          minHeight:
            31,

          px:
            1.2,

          pt:
            0.8,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            1,
        }}
      >

        <Typography
          noWrap

          sx={{
            minWidth:
              0,

            flex:
              1,

            fontSize:
              11.5,

            fontWeight:
              600,

            color:
              "#40566d",
          }}
        >
          {
            component?.title ||
            (
              component?.mediaType ===
              "video"
                ? "Video"
                : "Image"
            )
          }
        </Typography>


        <DashboardComponentMenu
          onConfigure={
            onConfigure
          }

          onDuplicate={
            onDuplicate
          }

          onMergeRight={
            onMergeRight
          }

          canMergeRight={
            canMergeRight
          }

          onRemove={
            onRemove
          }
        />

      </Box>


      {/* MEDIA */}

      <Box
        sx={{
          flex:
            1,

          minHeight:
            0,

          overflow:
            "hidden",
        }}
      >

        <DashboardMediaComponent
          config={
            component
          }
        />

      </Box>

    </Box>
  );
}

export default function DashboardComponentRenderer({
  component,
  dashboardId,

  value,

  data,
   tableData,
  loading = false,

  onConfigure,
  onDuplicate,

  onMergeRight,
  canMergeRight = false,

  onRemove,
}) {

  if (!component) {
    return null;
  }


//   if (
//   component?.type ===
//   "media"
// ) {

//   return (
//     <DashboardMediaComponent
//       config={
//         component
//       }
//     />
//   );
// }


  switch (
    component.type
  ) {


    case "media":

  return (
    <MediaComponent
      component={
        component
      }

      onConfigure={
        onConfigure
      }

      onDuplicate={
        onDuplicate
      }

      onMergeRight={
        onMergeRight
      }

      canMergeRight={
        canMergeRight
      }

      onRemove={
        onRemove
      }
    />
  );

    case "kpi":
  return (
    <KpiComponent
      component={component}
      value={value}
      loading={loading}

      onConfigure={onConfigure}
      onDuplicate={onDuplicate}
      onMergeRight={
        onMergeRight
      }

      canMergeRight={
        canMergeRight
      }
      onRemove={onRemove}
    />
  );

  case "table":

  return (
    <TableComponent
      component={
        component
      }

      dashboardId={
        dashboardId
      }

      onConfigure={
        onConfigure
      }

      onDuplicate={
        onDuplicate
      }

      onMergeRight={
        onMergeRight
      }

      canMergeRight={
        canMergeRight
      }

      onRemove={
        onRemove
      }
    />
  );


// if (
//   component?.type ===
//   "media"
// ) {

//   return (
//     <DashboardMediaComponent
//       config={
//         component
//       }
//     />
//   );
// }


case "crud":

  return (
    <CrudComponent
      component={
        component
      }

      onConfigure={
        onConfigure
      }

      onDuplicate={
        onDuplicate
      }

      onMergeRight={
        onMergeRight
      }

      canMergeRight={
        canMergeRight
      }

      onRemove={
        onRemove
      }
    />
  );

case "text":

  return (
    <DashboardTextComponent
      component={
        component
      }

      onConfigure={
        onConfigure
      }

      onDuplicate={
        onDuplicate
      }

      onMergeRight={
        onMergeRight
      }

      canMergeRight={
        canMergeRight
      }

      onRemove={
        onRemove
      }
    />
  );

case "chart":
  return (
    <ChartComponent
      component={component}
      data={data}

      onConfigure={onConfigure}
      onDuplicate={onDuplicate}
      onMergeRight={
        onMergeRight
      }

      canMergeRight={
        canMergeRight
      }
      onRemove={onRemove}
    />
  );


    default:

      return (
        <Box
          sx={{
            width:
              "100%",

            height:
              "100%",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            p: 2,
          }}
        >
          <Typography
            sx={{
              fontSize:
                11,

              color:
                "#60778d",
            }}
          >
            {component.type}
          </Typography>
        </Box>
      );
  }
}