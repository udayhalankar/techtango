// src/pages/workflows/utils/bpmn.js

// Attach BPMN semantics to our node kinds
export const tagBpmn = (node) => {
  const t = node.type;
  const d = node.data || {};
  if (t === 'initiator') return { ...node, data: { ...d, bpmnType: 'userTask', startEvent: true } };
  if (t === 'form')      return { ...node, data: { ...d, bpmnType: 'userTask' } };
  if (t === 'process')   return { ...node, data: { ...d, bpmnType: 'serviceTask' } };
  if (t === 'evaluate')  return { ...node, data: { ...d, bpmnType: 'gateway', gatewayType: d.gatewayType || 'XOR' } };
  return node;
};

// Simple BPMN sanity checks for our graph
export const validateBpmn = (nodes, edges) => {
  const errors = [];

  // Initiator: exactly one
  const init = nodes.filter(n => n.type === 'initiator');
  if (init.length !== 1) errors.push('Workflow must have exactly one Initiator.');

  // Evaluate must have 2 exits if XOR; OR can be >=1; AND has >=1 with no conditions check here
  nodes.filter(n => n.type === 'evaluate').forEach(n => {
    const outgoing = edges.filter(e => e.source === n.id);
    const kind = (n.data?.gatewayType || 'XOR').toUpperCase();
    if (kind === 'XOR' && outgoing.length !== 2) {
      errors.push(`Evaluate (XOR) at node ${n.id} needs exactly 2 outgoing flows.`);
    }
  });

  // No dangling nodes
  nodes.forEach(n => {
    const hasIn  = edges.some(e => e.target === n.id);
    const hasOut = edges.some(e => e.source === n.id);
    if (n.type !== 'initiator' && !hasIn) errors.push(`Node ${n.id} has no incoming connection.`);
    if (!hasOut && n.type !== 'evaluate') {
      // evaluate may be terminal if designer wants; relax for now
    }
  });

  return errors;
};
