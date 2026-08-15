import React, { memo, useEffect, useMemo, useRef } from "react";
import { Box, Button, Paper } from "@mui/material";
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  useReactFlow,
  updateEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const StepNode = memo(({ data }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 9,
        fontWeight: 600,
        border: "1px solid grey",
        borderRadius: 6,
        background: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <div
        className="node-drag-handle"
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#9ac7f5",
          border: "1px solid #6f9ecf",
          cursor: "grab",
          zIndex: 5,
          pointerEvents: "none",
          userSelect: "none",
          touchAction: "none",
        }}
      />
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="bt"
        type="target"
        position={Position.Bottom}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      {data?.label}
    </div>
  );
});

const DecisionNode = memo(() => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="node-drag-handle"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "translate(50%, 50%)",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#9ac7f5",
          border: "1px solid #6f9ecf",
          cursor: "grab",
          zIndex: 2,
          pointerEvents: "none",
          userSelect: "none",
          touchAction: "none",
        }}
      />
      <Handle
        id="t"
        type="source"
        position={Position.Top}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={{ background: "#0f4c81", width: 6, height: 6 }}
      />
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "#0f4c81",
          border: "2px solid #0b3b8c",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
});

const OrthogonalEdge = memo(
  ({ id, sourceX, sourceY, targetX, targetY, markerEnd, data }) => {
    const { setEdges } = useReactFlow();
    const midX = Math.round((sourceX + targetX) / 2);
    const offsetX = Number.isFinite(data?.offsetX) ? data.offsetX : 0;
    const elbowX = Math.round(midX + offsetX);
    const path = `M ${sourceX} ${sourceY} L ${elbowX} ${sourceY} L ${elbowX} ${targetY} L ${targetX} ${targetY}`;
    const hasVerticalMiddle = Math.abs(sourceY - targetY) > 1;
    const handleX = elbowX;
    const handleY = Math.round((sourceY + targetY) / 2);

    const onMouseDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startOffset = offsetX;
      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...(edge.data || {}), offsetX: startOffset + delta } }
              : edge
          )
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    return (
      <>
        <path
          id={id}
          d={path}
          fill="none"
          stroke="#0f4c81"
          strokeWidth={1}
          markerEnd={markerEnd}
        />
        {hasVerticalMiddle ? (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${handleX}px, ${handleY}px)`,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ffffff",
                border: "2px solid #0f4c81",
                cursor: "ns-resize",
                pointerEvents: "all",
              }}
              onMouseDown={onMouseDown}
            />
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

const RejectEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerEnd,
    data,
  }) => {
    const { setEdges } = useReactFlow();
    const offset = Number.isFinite(data?.offsetY) ? data.offsetY : -40;
    const aligned = Math.abs(sourceX - targetX) < 6;
    const elbowY = aligned ? Math.min(sourceY, targetY) + offset : Math.min(sourceY, targetY) + offset;
    const path = aligned
      ? `M ${sourceX} ${sourceY} L ${sourceX} ${targetY}`
      : `M ${sourceX} ${sourceY} L ${sourceX} ${elbowY} L ${targetX} ${elbowY} L ${targetX} ${targetY}`;
    const handleX = aligned ? sourceX : Math.round((sourceX + targetX) / 2);
    const handleY = aligned ? Math.round((sourceY + targetY) / 2) : Math.round(elbowY);

    const onMouseDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startY = event.clientY;
      const startOffset = offset;
      const onMove = (moveEvent) => {
        const delta = moveEvent.clientY - startY;
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...(edge.data || {}), offsetY: startOffset + delta } }
              : edge
          )
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    return (
      <>
        <path
          id={id}
          d={path}
          fill="none"
          stroke="#0f4c81"
          strokeWidth={1}
          markerEnd={markerEnd}
        />
        {!aligned ? (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${handleX}px, ${handleY}px)`,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ffffff",
                border: "2px solid #0f4c81",
                cursor: "ns-resize",
                pointerEvents: "all",
              }}
              onMouseDown={onMouseDown}
            />
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

export default function SimpleWorkflowMapRF({
  steps = [],
  onSelectStep,
  onOpenStep,
  onSaveView,
  saveViewDisabled,
  saveViewSaving,
}) {
  const nodeTypes = useMemo(
    () => ({ step: StepNode, decision: DecisionNode }),
    []
  );
  const edgeTypes = useMemo(
    () => ({ orth: OrthogonalEdge, reject: RejectEdge }),
    []
  );
  const rfInstanceRef = useRef(null);

  const { nodes: computedNodes, edges: computedEdges } = useMemo(() => {
    const ordered = [...steps].sort(
      (a, b) => Number(a.step_no) - Number(b.step_no)
    );
    const idByStepNo = new Map();
    ordered.forEach((step, index) => {
      const stepId = String(step.id ?? step.step_no ?? index);
      idByStepNo.set(Number(step.step_no), stepId);
    });
    const stepByNo = new Map(
      ordered.map((step) => [Number(step.step_no), step])
    );
    const baseNodes = [];
    const decisionNodes = [];
    const edges = [];
    const perRow = 5;
    const colGap = 200;
    const rowGap = 160;
    const originX = 80;
    const originY = 80;
    const stepWidth = 105;
    const stepHeight = 60;
    const decisionSize = 32;

    ordered.forEach((step, index) => {
      const stepId = idByStepNo.get(Number(step.step_no)) ?? String(step.id ?? step.step_no ?? index);
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const x = originX + col * colGap;
      const y = originY + row * rowGap;
      baseNodes.push({
        id: stepId,
        position: { x, y },
        data: {
          label: step.step_name || `Step ${step.step_no ?? index + 1}`,
          stepId: step.id ?? step.step_no ?? index,
        },
        style: { height: stepHeight, width: stepWidth },
        type: "step",
        draggable: true,
      });

      const next = ordered[index + 1];
      if (!next) return;
      const nextId = String(next.id ?? next.step_no ?? index + 1);
      const nextRow = Math.floor((index + 1) / perRow);
      const action = String(step.step_action || "").toLowerCase();
      const isRowChange = row !== nextRow;
      const rejectNo =
        step.next_step_after_reject != null && step.next_step_after_reject !== ""
          ? Number(step.next_step_after_reject)
          : null;
      if (action === "approve") {
        const decisionId = `dec-${stepId}`;
        const gap = colGap - stepWidth;
        decisionNodes.push({
          id: decisionId,
          position: {
            x: x + stepWidth + (gap - decisionSize) / 2,
            y: y + (stepHeight - decisionSize) / 2,
          },
          data: {},
          style: { width: decisionSize, height: decisionSize },
          type: "decision",
          draggable: true,
        });
        edges.push({
          id: `e-${stepId}-${decisionId}`,
          source: stepId,
          target: decisionId,
          type: "orth",
          sourceHandle: "r",
          targetHandle: "l",
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          data: { offsetX: 0 },
        });
        edges.push({
          id: `e-${decisionId}-${nextId}`,
          source: decisionId,
          target: nextId,
          type: "orth",
          sourceHandle: isRowChange ? "b" : "r",
          targetHandle: isRowChange ? "t" : "l",
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          data: { offsetX: 0 },
        });
        if (Number.isFinite(rejectNo)) {
          const rejectStep = stepByNo.get(rejectNo);
          if (rejectStep) {
            const rejectId =
              idByStepNo.get(Number(rejectStep.step_no)) ??
              String(rejectStep.id ?? rejectStep.step_no);
            edges.push({
              id: `e-${decisionId}-reject-${rejectStep.id}`,
              source: decisionId,
              target: rejectId,
              type: "reject",
              sourceHandle: "t",
              targetHandle: "bt",
              markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
              data: { offsetY: -40 },
            });
          }
        }
      } else {
        edges.push({
          id: `e-${stepId}-${nextId}`,
          source: stepId,
          target: nextId,
          type: "orth",
          sourceHandle: isRowChange ? "b" : "r",
          targetHandle: isRowChange ? "t" : "l",
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          data: { offsetX: 0 },
        });
      }
    });

    return { nodes: [...baseNodes, ...decisionNodes], edges };
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((node) => [node.id, node]));
      return computedNodes.map((node) => {
        const prevNode = prevById.get(node.id);
        return prevNode ? { ...node, position: prevNode.position } : node;
      });
    });
  }, [computedNodes, setNodes]);
  useEffect(() => {
    setEdges((prev) => {
      const prevById = new Map(prev.map((edge) => [edge.id, edge]));
      return computedEdges.map((edge) => {
        const prevEdge = prevById.get(edge.id);
        if (!prevEdge) return edge;
        if (prevEdge.source !== edge.source || prevEdge.target !== edge.target) {
          return edge;
        }
        return {
          ...edge,
          sourceHandle: prevEdge.sourceHandle ?? edge.sourceHandle,
          targetHandle: prevEdge.targetHandle ?? edge.targetHandle,
        };
      });
    });
  }, [computedEdges, setEdges]);

  const handleSaveView = () => {
    if (!onSaveView || !rfInstanceRef.current) return;
    const view = rfInstanceRef.current.toObject();
    onSaveView({
      nodes: view.nodes,
      edges: view.edges,
      viewport: view.viewport,
    });
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 1,
        borderColor: "grey.300",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "relative", height: "100%" }}>
        <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 5 }}>
          <Button
            size="small"
            variant="contained"
            disabled={saveViewDisabled || saveViewSaving || !onSaveView}
            onClick={handleSaveView}
          >
            {saveViewSaving ? "Saving..." : "Save View"}
          </Button>
        </Box>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(instance) => {
            rfInstanceRef.current = instance;
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable
          nodeDragThreshold={0}
          onNodeClick={(event, node) => {
            if (String(node.id).startsWith("dec-")) return;
            const stepId = node?.data?.stepId ?? node.id;
            if (onSelectStep) onSelectStep(stepId);
          }}
          onNodeDoubleClick={(event, node) => {
            if (String(node.id).startsWith("dec-")) return;
            const stepId = node?.data?.stepId ?? node.id;
            if (onOpenStep) onOpenStep(stepId);
          }}
          onEdgeUpdate={(oldEdge, newConnection) => {
            if (!newConnection) return;
            if (!newConnection.sourceHandle || !newConnection.targetHandle) return;
            if (
              oldEdge.source !== newConnection.source ||
              oldEdge.target !== newConnection.target
            ) {
              return;
            }
            setEdges((eds) => updateEdge(oldEdge, newConnection, eds));
          }}
          edgesUpdatable
          fitView
        >
          <Background gap={24} color="#e5e7eb" />
          <MiniMap zoomable pannable />
          <Controls />
        </ReactFlow>
      </Box>
    </Paper>
  );
}
