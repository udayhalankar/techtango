// client/src/pages/businessautomation/components/SimpleWorkflowMapRF.jsx

import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  Box,
  Button,
  Paper,
  Typography,
} from "@mui/material";

import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  updateEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";

import "reactflow/dist/style.css";

/* ============================================================
   MAP DESIGN CONSTANTS
============================================================ */

const COLORS = {
  canvas: "#edf2f7",

  grid: "#c9d5e2",

  text: "#19324a",
  muted: "#7b8da1",

  border: "#b9c8d8",

  blue: "#3768d7",
  blueDark: "#174e81",

  teal: "#0b9c97",

  green: "#22995c",
  greenSoft: "#f7fdf9",

  red: "#d84a43",
  redSoft: "#fffafa",

  amber: "#d89113",
  amberSoft: "#fffaf0",

  selected: "#2f77d0",
};

/* ============================================================
   COMMON HANDLE
============================================================ */

const handleStyle = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#ffffff",
  border: `2px solid ${COLORS.blue}`,
  boxSizing: "border-box",
};

/* ============================================================
   START NODE
============================================================ */

const StartNode = memo(({ data }) => {
  const selected = !!data?.selected;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        position: "relative",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        bgcolor: COLORS.greenSoft,

        border: selected
          ? `2px solid ${COLORS.selected}`
          : `1.5px solid ${COLORS.green}`,

        borderRadius: "32px",

        boxShadow: selected
          ? "0 0 0 3px rgba(47,119,208,.12), 0 5px 16px rgba(36,76,116,.10)"
          : "0 2px 7px rgba(30,60,90,.08)",

        cursor: "grab",

        transition:
          "border-color .14s ease, box-shadow .14s ease, transform .14s ease",

        "&:hover": {
          boxShadow:
            "0 5px 16px rgba(30,70,100,.13)",
        },
      }}
    >
      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={handleStyle}
      />

      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />

      <Box
        sx={{
          px: 2,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Typography
          sx={{
            fontSize: 11.5,
            lineHeight: 1.2,
            fontWeight: 700,
            color: COLORS.green,
          }}
        >
          {data?.label || "INITIATE"}
        </Typography>

        <Typography
          sx={{
            mt: 0.35,
            fontSize: 7.5,
            lineHeight: 1,
            fontWeight: 600,
            letterSpacing: ".15em",
            color: COLORS.muted,
          }}
        >
          START
        </Typography>
      </Box>
    </Box>
  );
});

/* ============================================================
   PROCESS NODE
============================================================ */

const ProcessNode = memo(({ data }) => {
  const selected = !!data?.selected;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        position: "relative",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        bgcolor: "#ffffff",

        border: selected
          ? `2px solid ${COLORS.selected}`
          : `1.25px solid ${COLORS.border}`,

        borderRadius: "7px",

        boxShadow: selected
          ? "0 0 0 3px rgba(47,119,208,.10), 0 5px 16px rgba(36,76,116,.10)"
          : "0 2px 6px rgba(30,55,80,.07)",

        cursor: "grab",

        transition:
          "border-color .14s ease, box-shadow .14s ease",

        "&:hover": {
          borderColor: "#92aac0",

          boxShadow:
            "0 5px 15px rgba(30,60,90,.10)",
        },
      }}
    >
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={handleStyle}
      />

      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={handleStyle}
      />

      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />

      <Handle
        id="bt"
        type="target"
        position={Position.Bottom}
        style={handleStyle}
      />

      {/* small process indicator */}
      <Box
        sx={{
          position: "absolute",

          left: 10,
          top: 9,

          width: 14,
          height: 14,

          borderRadius: "50%",

          bgcolor: "#9cc9f4",

          border:
            "1px solid #6da1d2",

          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          px: 2.5,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            lineHeight: 1.2,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {data?.label}
        </Typography>

        <Typography
          sx={{
            mt: 0.45,

            fontSize: 7.5,
            lineHeight: 1,

            fontWeight: 500,

            letterSpacing: ".13em",

            color: COLORS.muted,
          }}
        >
          STEP
        </Typography>
      </Box>
    </Box>
  );
});

/* ============================================================
   END NODE
============================================================ */

const EndNode = memo(({ data }) => {
  const selected = !!data?.selected;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        position: "relative",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        bgcolor: COLORS.redSoft,

        border: selected
          ? `2px solid ${COLORS.selected}`
          : `1.5px solid ${COLORS.red}`,

        borderRadius: "32px",

        boxShadow: selected
          ? "0 0 0 3px rgba(47,119,208,.12), 0 5px 16px rgba(36,76,116,.10)"
          : "0 2px 7px rgba(30,60,90,.08)",

        cursor: "grab",
      }}
    >
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={handleStyle}
      />

      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <Handle
        id="bt"
        type="target"
        position={Position.Bottom}
        style={handleStyle}
      />

      <Box
        sx={{
          px: 2,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Typography
          sx={{
            fontSize: 11.5,
            lineHeight: 1.2,
            fontWeight: 700,
            color: COLORS.red,
          }}
        >
          {data?.label || "TERMINATE"}
        </Typography>

        <Typography
          sx={{
            mt: 0.35,

            fontSize: 7.5,
            lineHeight: 1,

            fontWeight: 600,

            letterSpacing: ".15em",

            color: COLORS.muted,
          }}
        >
          END
        </Typography>
      </Box>
    </Box>
  );
});

/* ============================================================
   DECISION NODE
============================================================ */

const DecisionNode = memo(({ data }) => {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        position: "relative",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        cursor: "grab",
      }}
    >
      <Handle
        id="t"
        type="source"
        position={Position.Top}
        style={handleStyle}
      />

      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={handleStyle}
      />

      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 13,

          bgcolor: "#ffffff",

          border:
            `1.5px solid ${COLORS.teal}`,

          transform:
            "rotate(45deg)",

          boxShadow:
            "0 3px 10px rgba(30,65,95,.08)",
        }}
      />

      <Box
        sx={{
          position: "relative",

          zIndex: 2,

          width: "72%",

          textAlign: "center",

          pointerEvents: "none",
        }}
      >
        <Typography
          sx={{
            fontSize: 10.5,

            lineHeight: 1.2,

            fontWeight: 700,

            color: COLORS.teal,
          }}
        >
          {data?.label ||
            "Decision"}
        </Typography>

        <Typography
          sx={{
            mt: 0.4,

            fontSize: 7.2,

            lineHeight: 1,

            fontWeight: 500,

            letterSpacing: ".12em",

            color: COLORS.muted,
          }}
        >
          DECISION
        </Typography>
      </Box>
    </Box>
  );
});

/* ============================================================
   CURVED EDGE

   Similar visual language to your reference HTML:
   - smooth bezier connection
   - subtle line
   - compact branch label
============================================================ */

const WorkflowEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerEnd,
    label,
    data,
  }) => {
    const isReject =
      data?.branch === "reject";

    let path;

    if (isReject) {
      /*
       * Reject normally goes backward.
       * Route it above the workflow rather
       * than through the process nodes.
       */

      const lift =
        Number.isFinite(
          data?.lift
        )
          ? data.lift
          : 82;

      const topY =
        Math.min(
          sourceY,
          targetY
        ) - lift;

      const curve = 34;

      path = [
        `M ${sourceX} ${sourceY}`,

        `C ${sourceX} ${
          sourceY - curve
        }, ${sourceX} ${
          topY + curve
        }, ${sourceX} ${topY}`,

        `C ${sourceX} ${topY}, ${targetX} ${topY}, ${targetX} ${topY}`,

        `C ${targetX} ${
          topY + curve
        }, ${targetX} ${
          targetY - curve
        }, ${targetX} ${targetY}`,
      ].join(" ");
    } else {
      const dx =
        Math.max(
          50,
          Math.abs(
            targetX -
              sourceX
          ) * 0.48
        );

      path =
        `M ${sourceX} ${sourceY} ` +
        `C ${
          sourceX + dx
        } ${sourceY}, ${
          targetX - dx
        } ${targetY}, ${targetX} ${targetY}`;
    }

    const labelX =
      Math.round(
        (
          sourceX +
          targetX
        ) /
          2
      );

    const labelY = isReject
      ? Math.min(
          sourceY,
          targetY
        ) - 82
      : Math.round(
          (
            sourceY +
            targetY
          ) /
            2
        ) - 12;

    return (
      <>
        {/* wider invisible hit area */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          style={{
            pointerEvents:
              "stroke",
          }}
        />

        {/* visible edge */}
        <path
          id={id}
          d={path}
          fill="none"
          stroke={
            isReject
              ? "#99a9bb"
              : "#aab8c8"
          }
          strokeWidth={1.7}
          markerEnd={markerEnd}
        />

        {label ? (
          <EdgeLabelRenderer>
            <Box
              sx={{
                position:
                  "absolute",

                transform:
                  `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,

                px: 0.75,
                py: 0.18,

                border:
                  "1px solid #c6d2df",

                borderRadius:
                  "9px",

                bgcolor:
                  COLORS.canvas,

                color:
                  isReject
                    ? "#8a5660"
                    : "#58718a",

                fontSize: 8.5,

                fontWeight:
                  600,

                lineHeight:
                  1.35,

                whiteSpace:
                  "nowrap",

                pointerEvents:
                  "none",

                boxShadow:
                  "0 1px 2px rgba(25,50,75,.03)",
              }}
            >
              {label}
            </Box>
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

/* ============================================================
   MAIN MAP
============================================================ */

export default function SimpleWorkflowMapRF({
  steps = [],

  selectedStepId,

  onSelectStep,

  onOpenStep,

  onSaveView,

  saveViewDisabled,

  saveViewSaving,
}) {
  const rfInstanceRef =
    useRef(null);

  /* ----------------------------------------------------------
     NODE / EDGE TYPES
  ---------------------------------------------------------- */

  const nodeTypes =
    useMemo(
      () => ({
        start:
          StartNode,

        process:
          ProcessNode,

        decision:
          DecisionNode,

        end:
          EndNode,
      }),
      []
    );

  const edgeTypes =
    useMemo(
      () => ({
        workflow:
          WorkflowEdge,
      }),
      []
    );

  /* ==========================================================
     BUILD NODES + EDGES FROM EXISTING WORKFLOW STEPS
  ========================================================== */

  const {
    nodes:
      computedNodes,

    edges:
      computedEdges,
  } = useMemo(() => {
    const ordered = [
      ...(steps || []),
    ].sort(
      (a, b) =>
        Number(
          a.step_no
        ) -
        Number(
          b.step_no
        )
    );

    const idByStepNo =
      new Map();

    const stepByNo =
      new Map();

    ordered.forEach(
      (
        step,
        index
      ) => {
        const id =
          String(
            step.id ??
              step.step_no ??
              index
          );

        idByStepNo.set(
          Number(
            step.step_no
          ),
          id
        );

        stepByNo.set(
          Number(
            step.step_no
          ),
          step
        );
      }
    );

    const nodes = [];
    const edges = [];

    /*
     * Wider spacing than old map.
     * This is a process designer,
     * so nodes should breathe.
     */

    const originX = 80;
    const originY = 150;

    const horizontalGap =
      235;

    const processW = 168;
    const processH = 64;

    const terminalW = 150;
    const terminalH = 56;

    const decisionW =
      106;

    const decisionH =
      106;

    ordered.forEach(
      (
        step,
        index
      ) => {
        const stepId =
          String(
            step.id ??
              step.step_no ??
              index
          );

        const name =
          String(
            step.step_name ||
              ""
          )
            .trim()
            .toUpperCase();

        const isStart =
          Number(
            step.step_no
          ) === 0 ||
          name ===
            "INITIATE" ||
          String(
            step.step_type ||
              ""
          ).toLowerCase() ===
            "create";

        const isEnd =
          name ===
          "TERMINATE";

        const selected =
          Number(
            step.id
          ) ===
          Number(
            selectedStepId
          );

        const x =
          originX +
          index *
            horizontalGap;

        const y =
          originY;

        const nodeType =
          isStart
            ? "start"
            : isEnd
            ? "end"
            : "process";

        const width =
          isStart ||
          isEnd
            ? terminalW
            : processW;

        const height =
          isStart ||
          isEnd
            ? terminalH
            : processH;

        nodes.push({
          id: stepId,

          type:
            nodeType,

          position: {
            x,
            y,
          },

          data: {
            label:
              step.step_name ||
              `Step ${
                step.step_no ??
                index
              }`,

            stepId:
              step.id ??
              step.step_no ??
              index,

            selected,
          },

          style: {
            width,
            height,
          },

          draggable:
            true,
        });

        /* ----------------------------------------------
           Nothing comes after terminal
        ---------------------------------------------- */

        if (isEnd) {
          return;
        }

        const action =
          String(
            step.step_action ||
              ""
          ).toLowerCase();

        const nextApproveNo =
          step.next_step_after_approve !=
            null &&
          step.next_step_after_approve !==
            ""
            ? Number(
                step.next_step_after_approve
              )
            : null;

        const nextRejectNo =
          step.next_step_after_reject !=
            null &&
          step.next_step_after_reject !==
            ""
            ? Number(
                step.next_step_after_reject
              )
            : null;

        /*
         * Existing workflows sometimes rely
         * on sequential ordering rather than
         * explicit next_step_after_approve.
         */

        const sequentialNext =
          ordered[
            index + 1
          ];

        const approveStep =
          Number.isFinite(
            nextApproveNo
          )
            ? stepByNo.get(
                nextApproveNo
              )
            : sequentialNext;

        /* ==============================================
           APPROVAL STEP → DECISION
        ============================================== */

        if (
          action ===
          "approve"
        ) {
          const decisionId =
            `dec-${stepId}`;

          const decisionX =
            x +
            width +
            35;

          const decisionY =
            y -
            (
              decisionH -
              height
            ) /
              2;

          nodes.push({
            id:
              decisionId,

            type:
              "decision",

            position: {
              x:
                decisionX,

              y:
                decisionY,
            },

            data: {
              label:
                "Decision",
            },

            style: {
              width:
                decisionW,

              height:
                decisionH,
            },

            draggable:
              true,
          });

          /* process → decision */

          edges.push({
            id:
              `e-${stepId}-${decisionId}`,

            source:
              stepId,

            target:
              decisionId,

            type:
              "workflow",

            sourceHandle:
              "r",

            targetHandle:
              "l",

            markerEnd: {
              type:
                MarkerType.ArrowClosed,

              width:
                13,

              height:
                13,

              color:
                "#91a4b8",
            },

            data: {
              branch:
                "normal",
            },
          });

          /* decision → approve */

          if (
            approveStep
          ) {
            const approveId =
              idByStepNo.get(
                Number(
                  approveStep.step_no
                )
              ) ||
              String(
                approveStep.id
              );

            edges.push({
              id:
                `e-${decisionId}-approve-${approveId}`,

              source:
                decisionId,

              target:
                approveId,

              sourceHandle:
                "r",

              targetHandle:
                "l",

              type:
                "workflow",

              label:
                "Approve",

              markerEnd: {
                type:
                  MarkerType.ArrowClosed,

                width:
                  13,

                height:
                  13,

                color:
                  "#91a4b8",
              },

              data: {
                branch:
                  "approve",
              },
            });
          }

          /* decision → reject */

          if (
            Number.isFinite(
              nextRejectNo
            )
          ) {
            const rejectStep =
              stepByNo.get(
                nextRejectNo
              );

            if (
              rejectStep
            ) {
              const rejectId =
                idByStepNo.get(
                  Number(
                    rejectStep.step_no
                  )
                ) ||
                String(
                  rejectStep.id
                );

              edges.push({
                id:
                  `e-${decisionId}-reject-${rejectId}`,

                source:
                  decisionId,

                target:
                  rejectId,

                sourceHandle:
                  "t",

                targetHandle:
                  "bt",

                type:
                  "workflow",

                label:
                  "Reject",

                markerEnd: {
                  type:
                    MarkerType.ArrowClosed,

                  width:
                    13,

                  height:
                    13,

                  color:
                    "#91a4b8",
                },

                data: {
                  branch:
                    "reject",

                  lift:
                    90,
                },
              });
            }
          }

          return;
        }

        /* ==============================================
           NORMAL STEP → NEXT STEP
        ============================================== */

        if (
          approveStep
        ) {
          const approveId =
            idByStepNo.get(
              Number(
                approveStep.step_no
              )
            ) ||
            String(
              approveStep.id
            );

          edges.push({
            id:
              `e-${stepId}-${approveId}`,

            source:
              stepId,

            target:
              approveId,

            sourceHandle:
              "r",

            targetHandle:
              "l",

            type:
              "workflow",

            markerEnd: {
              type:
                MarkerType.ArrowClosed,

              width:
                13,

              height:
                13,

              color:
                "#91a4b8",
            },

            data: {
              branch:
                "normal",
            },
          });
        }
      }
    );

    return {
      nodes,
      edges,
    };
  }, [
    steps,
    selectedStepId,
  ]);

  /* ==========================================================
     REACT FLOW STATE
  ========================================================== */

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] =
    useNodesState([]);

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] =
    useEdgesState([]);

  /* ----------------------------------------------------------
     Preserve user-positioned nodes while refreshing workflow
  ---------------------------------------------------------- */

  useEffect(() => {
    setNodes(
      (
        previous
      ) => {
        const oldById =
          new Map(
            previous.map(
              (
                node
              ) => [
                node.id,
                node,
              ]
            )
          );

        return computedNodes.map(
          (
            node
          ) => {
            const old =
              oldById.get(
                node.id
              );

            if (
              !old
            ) {
              return node;
            }

            return {
              ...node,

              position:
                old.position,
            };
          }
        );
      }
    );
  }, [
    computedNodes,
    setNodes,
  ]);

  /* ----------------------------------------------------------
     Refresh edges but preserve manually updated endpoints
  ---------------------------------------------------------- */

  useEffect(() => {
    setEdges(
      (
        previous
      ) => {
        const oldById =
          new Map(
            previous.map(
              (
                edge
              ) => [
                edge.id,
                edge,
              ]
            )
          );

        return computedEdges.map(
          (
            edge
          ) => {
            const old =
              oldById.get(
                edge.id
              );

            if (
              !old
            ) {
              return edge;
            }

            if (
              old.source !==
                edge.source ||
              old.target !==
                edge.target
            ) {
              return edge;
            }

            return {
              ...edge,

              sourceHandle:
                old.sourceHandle ??
                edge.sourceHandle,

              targetHandle:
                old.targetHandle ??
                edge.targetHandle,
            };
          }
        );
      }
    );
  }, [
    computedEdges,
    setEdges,
  ]);

  /* ==========================================================
     SAVE MAP VIEW
  ========================================================== */

  const handleSaveView =
    () => {
      if (
        !onSaveView ||
        !rfInstanceRef.current
      ) {
        return;
      }

      const view =
        rfInstanceRef.current.toObject();

      onSaveView({
        nodes:
          view.nodes,

        edges:
          view.edges,

        viewport:
          view.viewport,
      });
    };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Paper
      elevation={0}
      sx={{
        height:
          "100%",

        minHeight:
          0,

        borderRadius:
          0,

        border:
          "1px solid #d8e2eb",

        borderTop:
          0,

        overflow:
          "hidden",

        bgcolor:
          COLORS.canvas,
      }}
    >
      <Box
        sx={{
          position:
            "relative",

          width:
            "100%",

          height:
            "100%",

          minHeight:
            0,
        }}
      >
        {/* ==================================================
            SAVE VIEW
        ================================================== */}

        <Box
          sx={{
            position:
              "absolute",

            top:
              10,

            right:
              10,

            zIndex:
              10,
          }}
        >
          <Button
            size="small"

            variant="contained"

            disabled={
              saveViewDisabled ||
              saveViewSaving ||
              !onSaveView
            }

            onClick={
              handleSaveView
            }

            sx={{
              minHeight:
                27,

              height:
                27,

              px:
                1.2,

              borderRadius:
                "3px",

              textTransform:
                "none",

              fontSize:
                9.5,

              fontWeight:
                600,

              bgcolor:
                "#0879df",

              boxShadow:
                "0 2px 5px rgba(20,65,105,.16)",

              "&:hover": {
                bgcolor:
                  "#066dc8",
              },
            }}
          >
            {saveViewSaving
              ? "Saving..."
              : "Save View"}
          </Button>
        </Box>

        <ReactFlow
          nodes={nodes}

          edges={edges}

          nodeTypes={
            nodeTypes
          }

          edgeTypes={
            edgeTypes
          }

          onInit={(
            instance
          ) => {
            rfInstanceRef.current =
              instance;
          }}

          onNodesChange={
            onNodesChange
          }

          onEdgesChange={
            onEdgesChange
          }

          nodesDraggable

          nodeDragThreshold={
            0
          }

          nodesConnectable={
            false
          }

          elementsSelectable

          fitView

          fitViewOptions={{
            padding:
              0.14,

            minZoom:
              0.55,

            maxZoom:
              1,
          }}

          minZoom={
            0.3
          }

          maxZoom={
            1.6
          }

          defaultEdgeOptions={{
            type:
              "workflow",

            markerEnd: {
              type:
                MarkerType.ArrowClosed,

              color:
                "#91a4b8",
            },
          }}

          onNodeClick={(
            event,
            node
          ) => {
            if (
              String(
                node.id
              ).startsWith(
                "dec-"
              )
            ) {
              return;
            }

            const stepId =
              node?.data
                ?.stepId ??
              node.id;

            onSelectStep?.(
              stepId
            );
          }}

          onNodeDoubleClick={(
            event,
            node
          ) => {
            if (
              String(
                node.id
              ).startsWith(
                "dec-"
              )
            ) {
              return;
            }

            const stepId =
              node?.data
                ?.stepId ??
              node.id;

            onOpenStep?.(
              stepId
            );
          }}

          onEdgeUpdate={(
            oldEdge,
            newConnection
          ) => {
            if (
              !newConnection
            ) {
              return;
            }

            /*
             * Do not let an edge update
             * change the actual workflow
             * routing.
             *
             * Existing functionality allows
             * moving which handle an edge
             * attaches to.
             */

            if (
              oldEdge.source !==
                newConnection.source ||
              oldEdge.target !==
                newConnection.target
            ) {
              return;
            }

            setEdges(
              (
                current
              ) =>
                updateEdge(
                  oldEdge,
                  newConnection,
                  current
                )
            );
          }}

          edgesUpdatable

          proOptions={{
            hideAttribution:
              true,
          }}
        >
          {/* ==================================================
              CANVAS DOT GRID
          ================================================== */}

          <Background
            variant="dots"
            gap={26}
            size={1.25}
            color={
              COLORS.grid
            }
          />

          {/* ==================================================
              MINIMAP
          ================================================== */}

          <MiniMap
            zoomable
            pannable

            position="bottom-right"

            style={{
              width:
                150,

              height:
                78,

              background:
                "rgba(255,255,255,.86)",

              border:
                "1px solid #d9e1e9",

              borderRadius:
                3,

              boxShadow:
                "none",
            }}

            nodeColor={(
              node
            ) => {
              if (
                node.type ===
                "start"
              ) {
                return COLORS.green;
              }

              if (
                node.type ===
                "end"
              ) {
                return COLORS.red;
              }

              if (
                node.type ===
                "decision"
              ) {
                return COLORS.teal;
              }

              return "#b4c5d6";
            }}

            maskColor="rgba(237,242,247,.66)"
          />

          {/* ==================================================
              MAP CONTROLS
          ================================================== */}

          <Controls
            position="bottom-left"

            showInteractive={
              false
            }
          />
        </ReactFlow>
      </Box>
    </Paper>
  );
}