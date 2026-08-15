import React, { memo, useEffect, useMemo } from "react";
import { Box, Paper, Typography } from "@mui/material";
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const StepNode = memo(({ data }) => {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{ background: "#0f4c81", width: 6, height: 6, pointerEvents: "none" }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ background: "#0f4c81", width: 6, height: 6, pointerEvents: "none" }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ background: "#0f4c81", width: 6, height: 6, pointerEvents: "none" }}
      />
      <Box
        sx={{
          textAlign: "center",
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data?.label}
      </Box>
    </Box>
  );
});

const DecisionNode = memo(({ data }) => {
  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        boxSizing: "border-box",
      }}
    >
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        style={{ background: "#0f4c81", width: 4, height: 4, pointerEvents: "none" }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ background: "#0f4c81", width: 4, height: 4, pointerEvents: "none" }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ background: "#0f4c81", width: 4, height: 4, pointerEvents: "none" }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          bgcolor: "#0f4c81",
          border: "2px solid #0b3b8c",
          transform: "rotate(45deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            transform: "rotate(-45deg)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            pointerEvents: "none",
          }}
        >
          {data?.label || ""}
        </Box>
      </Box>
    </Box>
  );
});

const RejectEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerEnd,
    label,
  }) => {
    const topY = Math.min(sourceY, targetY) - 70;
    const path = `M ${sourceX} ${sourceY} L ${sourceX} ${topY} L ${targetX} ${topY} L ${targetX} ${targetY}`;
    const labelX = Math.round((sourceX + targetX) / 2);
    const labelY = Math.round(topY - 16);
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
        {label ? (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                background: "#ffffff",
                padding: "0 6px",
                fontSize: 11,
                fontWeight: 700,
                color: "#0f4c81",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

const OrthogonalEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerEnd,
    label,
  }) => {
    const midX = Math.round((sourceX + targetX) / 2);
    const edgePath = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
    const roundedLabelX = midX;
    const roundedLabelY = Math.round(targetY - 12);
    return (
      <>
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke="#0f4c81"
          strokeWidth={1}
          markerEnd={markerEnd}
        />
        {label ? (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${roundedLabelX}px, ${roundedLabelY}px)`,
                background: "#ffffff",
                padding: "0 6px",
                fontSize: 11,
                fontWeight: 700,
                color: "#0f4c81",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

export default function SimpleWorkflowMap({
  steps = [],
  selectedStepId,
  onSelectStep,
  onOpenStep,
}) {
  const ordered = useMemo(
    () =>
      [...(steps || [])].sort(
        (a, b) => Number(a.step_no) - Number(b.step_no)
      ),
    [steps]
  );

  const { nodes: computedNodes, edges: computedEdges } = useMemo(() => {
    const stepByNo = new Map();
    ordered.forEach((step) => {
      stepByNo.set(Number(step.step_no), step);
    });

    const baseNodes = [];
    const decisionNodes = [];
    const allEdges = [];

    ordered.forEach((step, idx) => {
      const isActive = Number(step.id) === Number(selectedStepId);
      const stepId = String(step.id ?? step.step_no ?? idx);
      const x = idx * 220;
      const y = 80;

      baseNodes.push({
        id: stepId,
        type: "step",
        position: { x, y },
        sourcePosition: "right",
        targetPosition: "left",
        draggable: true,
        selectable: true,
        data: {
          label: (
            <Box
              sx={{
                textAlign: "center",
                pointerEvents: "none",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "grey.600" }}>
                Step {step.step_no}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {step.step_name}
              </Typography>
            </Box>
          ),
        },
        style: {
          border: isActive ? "2px solid #2563eb" : "1px solid #cbd5e1",
          background: isActive ? "#eff6ff" : "#fff",
          borderRadius: 8,
          width: 160,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isActive ? "0 2px 6px rgba(37,99,235,0.2)" : "none",
          boxSizing: "border-box",
        },
      });

      const action = String(step.step_action || "").toLowerCase();
      const hasDecision = action === "approve";
      const nextApproveNo =
        step.next_step_after_approve != null && step.next_step_after_approve !== ""
          ? Number(step.next_step_after_approve)
          : null;
      const nextRejectNo =
        step.next_step_after_reject != null && step.next_step_after_reject !== ""
          ? Number(step.next_step_after_reject)
          : null;

      if (hasDecision) {
        const decisionId = `dec-${stepId}`;
        decisionNodes.push({
          id: decisionId,
          type: "decision",
          position: { x: x + 190, y: y + 16 },
          sourcePosition: "right",
          targetPosition: "left",
          data: { label: "" },
          draggable: true,
          selectable: true,
        });

        allEdges.push({
          id: `e_${stepId}_${decisionId}`,
          source: stepId,
          target: decisionId,
          sourceHandle: "right",
          targetHandle: "left",
          type: "orth",
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          style: { stroke: "#6b8bb3" },
        });

        if (Number.isFinite(nextApproveNo)) {
          const approveStep = stepByNo.get(nextApproveNo);
          if (approveStep) {
            allEdges.push({
              id: `e_${decisionId}_approve_${approveStep.id}`,
              source: decisionId,
              target: String(approveStep.id),
              sourceHandle: "right",
              targetHandle: "left",
              type: "orth",
              label: "Approve",
              markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
              style: { stroke: "#6b8bb3" },
              labelStyle: { fill: "#0f4c81", fontSize: 11, fontWeight: 700 },
            });
          }
        }

        if (Number.isFinite(nextRejectNo)) {
          const rejectStep = stepByNo.get(nextRejectNo);
          if (rejectStep) {
            allEdges.push({
              id: `e_${decisionId}_reject_${rejectStep.id}`,
              source: decisionId,
              target: String(rejectStep.id),
              sourceHandle: "top",
              targetHandle: "top",
              type: "reject",
              label: "Reject",
              markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
              style: { stroke: "#6b8bb3" },
              labelStyle: { fill: "#0f4c81", fontSize: 11, fontWeight: 700 },
            });
          }
        }
      } else if (Number.isFinite(nextApproveNo)) {
        const approveStep = stepByNo.get(nextApproveNo);
        if (approveStep) {
          allEdges.push({
            id: `e_${stepId}_${approveStep.id}`,
            source: stepId,
            target: String(approveStep.id),
            sourceHandle: "right",
            targetHandle: "left",
            type: "orth",
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
            style: { stroke: "#9aa9bf" },
          });
        }
      }
    });

    return {
      nodes: [...baseNodes, ...decisionNodes],
      edges: allEdges,
    };
  }, [ordered, selectedStepId]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setEdges(computedEdges);
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return computedNodes.map((n) => {
        const prevNode = prevById.get(n.id);
        return prevNode ? { ...n, position: prevNode.position } : n;
      });
    });
  }, [computedNodes, computedEdges, setEdges, setNodes]);

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        height: "100%",
        p: 2,
        borderRadius: 1,
        borderColor: "grey.300",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Workflow Map
        </Typography>
        <Typography variant="caption" sx={{ color: "grey.600" }}>
          Click a step to select it. This is a visual map preview.
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 320,
          borderRadius: 1,
          border: "1px solid #e5e7eb",
          bgcolor: "#f8fafc",
          overflow: "hidden",
        }}
      >
        {ordered.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: "grey.600" }}>
              No steps to display.
            </Typography>
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ decision: DecisionNode, step: StepNode }}
            edgeTypes={{ reject: RejectEdge, orth: OrthogonalEdge }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable
            nodeDragThreshold={0}
            nodesConnectable={false}
            onNodeClick={(event, node) => {
              if (String(node.id).startsWith("dec-")) return;
              const stepId = Number(node.id);
              if (onSelectStep) onSelectStep(stepId);
            }}
            onNodeDoubleClick={(event, node) => {
              if (String(node.id).startsWith("dec-")) return;
              const stepId = Number(node.id);
              if (onOpenStep) onOpenStep(stepId);
            }}
          >
            <Background color="#e5e7eb" gap={24} />
            <MiniMap zoomable pannable />
            <Controls />
          </ReactFlow>
        )}
      </Box>
    </Paper>
  );
}
