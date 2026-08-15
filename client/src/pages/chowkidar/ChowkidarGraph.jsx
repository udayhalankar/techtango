// src/pages/ChowkidarGraph.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import cola from "cytoscape-cola";
import navigator from "cytoscape-navigator";
import {
  Box, Stack, Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, Divider, Button
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

cytoscape.use(dagre);
cytoscape.use(cola);
navigator(cytoscape); // minimap

const KIND_COLORS = {
  route: "#f6ad55", controller: "#fbd38d", middleware: "#9ae6b4",
  helper: "#b794f4", component: "#f687b3", page: "#63b3ed", util: "#e2e8f0",
  group: "#cbd5e0"
};

export default function ChowkidarGraph() {
  const cyRef = useRef(null);
  const [raw, setRaw] = useState(null);
  const [elements, setElements] = useState([]);
  const [layoutName, setLayoutName] = useState("breadthfirst");
  const [query, setQuery] = useState("");
  const [activeKinds, setActiveKinds] = useState(
    new Set(["route","controller","middleware","helper","component","page","util"])
  );
  const [stack, setStack] = useState([]); // for drill-down (breadcrumb)

  // Fetch once
  useEffect(() => {
    fetch("/api/chowkidar/graph").then(r => r.json()).then(setRaw);
  }, []);

  // Build top-level groups (aggregate by dir or module)
  const topLevel = useMemo(() => {
    if (!raw) return { nodes: [], edges: [] };
    const nodes = [];
    const edges = [];
    const byGroup = new Map(); // key: group name (dir or module)

    for (const n of raw.nodes) {
      const group = (n.module || n.dir || "misc").split("/")[0];
      if (!byGroup.has(group)) {
        byGroup.set(group, { id: `group:${group}`, label: group, files: [] });
      }
      byGroup.get(group).files.push(n);
    }

    // group nodes
    for (const g of byGroup.values()) {
      nodes.push({
        data: { id: g.id, label: g.label, kind: "group", short: g.label }
      });
    }

    // group edges (route between groups if any file crosses groups)
    const key = (a,b) => `${a}→${b}`;
    const seen = new Set();
    for (const e of raw.edges) {
      const a = raw.nodesById?.[e.source] || raw.nodes.find(n => n.id === e.source);
      const b = raw.nodesById?.[e.target] || raw.nodes.find(n => n.id === e.target);
      if (!a || !b) continue;
      const ga = (a.module || a.dir || "misc").split("/")[0];
      const gb = (b.module || b.dir || "misc").split("/")[0];
      if (ga === gb) continue;
      const k = key(ga, gb);
      if (seen.has(k)) continue;
      seen.add(k);
      edges.push({ data: { id: k, source: `group:${ga}`, target: `group:${gb}` } });
    }

    return { nodes, edges, groups: byGroup };
  }, [raw]);

  // Drill down into a group node
  const openGroup = (groupName) => {
    if (!raw) return;
    const files = topLevel.groups.get(groupName)?.files || [];
    const fileIds = new Set(files.map(f => f.id));
    const nodes = files
      .filter(f => activeKinds.has(f.kind))
      .map(f => ({
        data: {
          id: f.id,
          label: f.label || f.name,
          short: (f.label || f.name || f.id).split("/").slice(-1)[0],
          kind: f.kind
        }
      }));
    const edges = raw.edges
      .filter(e => fileIds.has(e.source) && fileIds.has(e.target))
      .map((e, i) => ({ data: { id: `e${i}:${e.source}->${e.target}`, source: e.source, target: e.target }}));
    setStack(s => [...s, groupName]);
    setElements([...nodes, ...edges]);
  };

  const goBack = () => {
    const next = [...stack];
    next.pop();
    setStack(next);
    if (next.length === 0) {
      setElements([...topLevel.nodes, ...topLevel.edges]);
    } else {
      openGroup(next.at(-1));
    }
  };

  // initial render = top-level groups
  useEffect(() => {
    if (!raw) return;
    setElements([...topLevel.nodes, ...topLevel.edges]);
  }, [raw, topLevel.nodes.length, topLevel.edges.length]);

  // styling
  const stylesheet = useMemo(() => ([
    {
      selector: "node",
      style: {
        "background-color": ele => KIND_COLORS[ele.data("kind")] || "#a0aec0",
        "label": "data(short)",
        "font-size": 10,
        "text-wrap": "wrap",
        "text-max-width": 120,
        "min-zoomed-font-size": 9,    // hide labels until zoomed in
        "text-halign": "center",
        "text-valign": "center",
        "width": ele => (ele.data("kind")==="group" ? 80 : 28),
        "height": ele => (ele.data("kind")==="group" ? 48 : 28),
        "shape": ele => (ele.data("kind")==="group" ? "round-rectangle" : "ellipse"),
        "border-width": ele => (ele.data("kind")==="group" ? 1 : 0),
        "border-color": "#718096"
      }
    },
    {
      selector: "edge",
      style: {
        "width": 1.2,
        "opacity": 0.6,
        "curve-style": "straight",
        "line-color": "#CBD5E0",
      }
    },
    { // hover highlight
      selector: ".faded",
      style: { "opacity": 0.1 }
    },
    {
      selector: "node:selected",
      style: { "border-width": 2, "border-color": "#2b6cb0" }
    }
  ]), []);

  // apply layout
  const layout = useMemo(() => ({
    name: layoutName,
    fit: true,
    animate: false,
    spacingFactor: 1.1,
    padding: 20,
    nodeSep: 20, edgeSep: 10, rankSep: 30, // dagre/breadthfirst
    avoidOverlap: true
  }), [layoutName]);

  // search + hover effects
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      cy.elements().addClass("faded");
      node.removeClass("faded");
      node.closedNeighborhood().removeClass("faded");
    });
    cy.on("mouseout", "node", () => cy.elements().removeClass("faded"));

    // click to drill down on group nodes
    cy.on("tap", "node", (evt) => {
      const n = evt.target;
      if (n.data("kind") === "group") openGroup(n.data("label"));
    });

    // minimap
    cy.navigator({ container: false }); // default floating minimap

    return () => { cy.removeListener("mouseover"); cy.removeListener("mouseout"); cy.removeListener("tap"); };
  }, [elements]);

  // client-side search highlight
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("match");
    if (!query.trim()) return;
    const q = query.toLowerCase();
    cy.nodes().filter(n => (n.data("label") || "").toLowerCase().includes(q) || (n.data("id")||"").toLowerCase().includes(q))
      .forEach(n => {
        n.style("border-color", "#2c5282");
        n.style("border-width", 2);
      });
  }, [query, elements]);

  const toggleKind = (k) => {
    const s = new Set(activeKinds);
    s.has(k) ? s.delete(k) : s.add(k);
    setActiveKinds(s);
    // if inside a group, refresh drill-down view
    if (stack.length) openGroup(stack.at(-1));
  };

  return (
    <Box p={2} sx={{ height: "calc(100vh - 140px)" }}>
      <Stack direction="row" spacing={2} alignItems="center">
        {["route","controller","middleware","helper","component","page","util"].map(k => (
          <Chip key={k} label={k}
            color={activeKinds.has(k) ? "primary" : "default"}
            variant={activeKinds.has(k) ? "filled" : "outlined"}
            onClick={() => toggleKind(k)} />
        ))}

        <Divider orientation="vertical" flexItem />

        <FormControl size="small">
          <InputLabel>Layout</InputLabel>
          <Select value={layoutName} label="Layout" onChange={(e)=>setLayoutName(e.target.value)}>
            <MenuItem value="breadthfirst">Breadthfirst (directed)</MenuItem>
            <MenuItem value="dagre">Dagre (flow)</MenuItem>
            <MenuItem value="cose">CoSE (clusters)</MenuItem>
            <MenuItem value="cola">Cola (balanced)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Search node…"
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          sx={{ width: 260 }}
        />

        <Tooltip title="Reload">
          <IconButton onClick={()=>window.location.reload()}><RefreshIcon/></IconButton>
        </Tooltip>

        {stack.length > 0 && (
          <Tooltip title="Back to groups">
            <Button startIcon={<ArrowBackIcon/>} onClick={goBack}>Back</Button>
          </Tooltip>
        )}
      </Stack>

      <Box mt={2} sx={{ height: "100%", border: "1px solid #e2e8f0", borderRadius: 2 }}>
        <CytoscapeComponent
          cy={(cy)=> (cyRef.current = cy)}
          elements={elements}
          layout={layout}
          stylesheet={stylesheet}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
    </Box>
  );
}
