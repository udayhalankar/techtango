// src/pages/ChowkidarDashboard.jsx — MERGED
// Keeps the OLD "Checks" tab exactly as-is.
// Replaces the old Cytoscape graph with the NEW Tree & Focus view (Client/Server/Root).

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box, Stack, Typography, TextField, Select, MenuItem, Chip, Card,
  CardContent, Divider, IconButton, Tooltip, LinearProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, List, ListItem,
  ListItemText, Tabs, Tab, Alert, Paper, ListItemButton, Collapse
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import api from "../services/api"; // axios instance

/* ========================= NEW GRAPH VIEW (Tree + Focus) ========================= */
const KIND_COLORS = {
  file: "#CBD5E0",
  route: "#f6ad55",
  controller: "#fbd38d",
  middleware: "#9ae6b4",
  helper: "#b794f4",
  component: "#f687b3",
  page: "#63b3ed",
  util: "#e2e8f0",
};
const ALL_KINDS = ["file", "route", "controller", "middleware", "helper", "component", "page", "util"];

function detectSide(p) {
  if (p.startsWith("client/") || p.startsWith("frontend/")) return "client";
  if (p.startsWith("server/") || p.startsWith("backend/")) return "server";
  return "root"; // e.g., agent/, scripts/, config files, etc.
}

function useGraphData() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/chowkidar/graph", {
          params: { t: Date.now() },
          headers: { "Cache-Control": "no-cache" },
        });
        if (!alive) return;
        setRaw(res.data);
      } catch (e) {
        setError(e?.response?.data?.error || e.message || "Failed to load graph data");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const graph = useMemo(() => (raw ? normalizeRaw(raw) : null), [raw]);
  return { graph, loading, error };
}

function normalizeRaw(raw) {
  const nodes = (raw.nodes || []).map((n) => ({
    id: n.id || n.path,
    path: (n.path || n.id || "").replace(/\\/g, "/"),
    kind: n.kind || "file",
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = (raw.edges || [])
    .filter((e) => e.source && e.target)
    .map((e, i) => ({ id: e.id || `e${i}`, source: e.source, target: e.target, type: e.type || "import" }));

  for (const n of nodes) {
    const p = n.path;
    n.side = detectSide(p);
    n.name = p.split("/").pop();
  }
  return { nodes, edges, byId };
}

function buildTree(files, side) {
  const root = { id: `${side}:root`, name: side, path: side, dir: true, children: [] };
  const index = new Map([[root.path, root]]);

  const ensureDir = (accPath) => {
    if (index.has(accPath)) return index.get(accPath);
    const parentPath = accPath.split("/").slice(0, -1).join("/") || side;
    const name = accPath.split("/").pop();
    const node = { id: `dir:${accPath}`, name, path: accPath, dir: true, children: [] };
    const parent = ensureDir(parentPath);
    parent.children.push(node);
    index.set(accPath, node);
    return node;
  };

  files.forEach((f) => {
    const rel = f.path;
    const parts = rel.split("/");
    const idx = parts.findIndex((p) => ["client", "frontend", "server", "backend"].includes(p));
    const after = idx >= 0 ? parts.slice(idx + 1) : parts;
    let acc = side;
    for (let i = 0; i < after.length - 1; i++) {
      acc += "/" + after[i];
      ensureDir(acc);
    }
    const parent = index.get(acc) || root;
    parent.children.push({ id: f.id, name: after[after.length - 1], path: f.path, kind: f.kind, side: f.side, dir: false });
  });

  const sortRec = (node) => {
    if (!node.children) return;
    node.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
    node.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

function findPath(root, predicate) {
  const path = [];
  function dfs(node) {
    path.push(node);
    if (predicate(node)) return true;
    if (node.children) {
      for (const c of node.children) if (dfs(c)) return true;
    }
    path.pop();
    return false;
  }
  dfs(root);
  return path;
}

function MuiListTree({ node, expanded, setExpanded, onSelect, activeKinds, query }) {
  const isDir = !!node.dir;
  const open = expanded.has(node.id);
  const visible = isDir || activeKinds.has(node.kind);
  if (!visible) return null;

  const toggle = () => {
    const next = new Set(expanded);
    open ? next.delete(node.id) : next.add(node.id);
    setExpanded(next);
  };

  const labelChip = (
    <Tooltip title={node.path || node.name} placement="right" arrow>
      <Box
        sx={{
          px: 1,
          py: 0.3,
          borderRadius: 1.5,
          bgcolor: isDir ? "transparent" : KIND_COLORS[node.kind] || KIND_COLORS.file,
          border: isDir ? "none" : "1px solid rgba(0,0,0,0.1)",
          fontSize: 12,
        }}
      >
        {node.name}
      </Box>
    </Tooltip>
  );

  const match = query && node.path?.toLowerCase().includes(query.toLowerCase());

  return (
    <>
      <ListItemButton dense onClick={isDir ? toggle : () => onSelect(node.id)} sx={{ pl: isDir ? 1 : 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
          {isDir ? (open ? <ExpandLess fontSize="small"/> : <ExpandMore fontSize="small"/>) : null}
          {labelChip}
          {!isDir && (
            <Typography variant="caption" color="text.secondary">{node.kind || "file"}</Typography>
          )}
          {match && <Typography variant="caption" sx={{ ml: "auto", color: "primary.main" }}>match</Typography>}
        </Stack>
      </ListItemButton>
      {isDir && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ pl: 2 }}>
            {node.children?.map((c) => (
              <MuiListTree
                key={c.id}
                node={c}
                expanded={expanded}
                setExpanded={setExpanded}
                onSelect={onSelect}
                activeKinds={activeKinds}
                query={query}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

function TreePane({ title, root, selectedId, onSelect, activeKinds, query }) {
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => { if (root) setExpanded(new Set([root.id])); }, [root?.id]);

  useEffect(() => {
    if (!root || (!query && !selectedId)) return;
    const targetPath = findPath(
      root,
      (n) => (!!query && n.path?.toLowerCase().includes(query.toLowerCase())) || n.id === selectedId
    );
    if (targetPath.length) {
      const toExpand = targetPath.slice(0, -1).map((n) => n.id);
      setExpanded((prev) => new Set([...Array.from(prev), ...toExpand]));
    }
  }, [query, selectedId, root]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100", overflow: "auto" }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
      {root && (
        <List dense>
          <MuiListTree
            node={root}
            expanded={expanded}
            setExpanded={setExpanded}
            onSelect={onSelect}
            activeKinds={activeKinds}
            query={query}
          />
        </List>
      )}
    </Paper>
  );
}

function RadialGraph({ center, imports, callers }) {
  const W = 720, H = 260;
  const cx = W / 2, cy = H / 2;
  const r1 = 60, r2 = 110;

  const place = (count, side) => {
    const spread = Math.max(1, count);
    return (idx) => {
      const t = (idx + 1) / (spread + 1);
      const angle = (Math.PI * (0.8 + 0.4 * t)) * (side === -1 ? 1 : -1);
      return { x: cx + r2 * Math.cos(angle), y: cy + r2 * Math.sin(angle) };
    };
  };

  const posCall = place(callers.length, -1);
  const posImp = place(imports.length, +1);

  const NodeBox = ({ x, y, label, kind }) => (
    <g transform={`translate(${x - 48},${y - 12})`}>
      <rect width={96} height={24} rx={8} ry={8} fill={KIND_COLORS[kind] || KIND_COLORS.file} stroke="rgba(0,0,0,0.15)" />
      <text x={48} y={15} textAnchor="middle" fontSize="11">{label}</text>
    </g>
  );

  return (
    <Paper variant="outlined" sx={{ p: 1, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220">
        <g>
          <circle cx={cx} cy={cy} r={r1} fill={KIND_COLORS[center.kind] || KIND_COLORS.file} stroke="rgba(0,0,0,0.2)" />
          <text x={cx} y={cy+4} textAnchor="middle" fontSize="12" fontWeight={600}>{center.name}</text>
        </g>
        {callers.map((n, i) => {
          const p = posCall(i);
          return (
            <g key={n.id}>
              <path d={`M ${p.x} ${p.y} Q ${cx - 30} ${cy} ${cx - r1} ${cy}`} stroke="#CBD5E0" fill="none" />
              <NodeBox x={p.x} y={p.y} label={n.name} kind={n.kind} />
            </g>
          );
        })}
        {imports.map((n, i) => {
          const p = posImp(i);
          return (
            <g key={n.id}>
              <path d={`M ${cx + r1} ${cy} Q ${cx + 30} ${cy} ${p.x} ${p.y}`} stroke="#CBD5E0" fill="none" />
              <NodeBox x={p.x} y={p.y} label={n.name} kind={n.kind} />
            </g>
          );
        })}
      </svg>
    </Paper>
  );
}

function ListBox({ title, items }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, flex: 1, minHeight: 120, overflow: "auto" }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
      <Stack spacing={0.5}>
        {items.map((n) => (
          <Stack key={n.id} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: KIND_COLORS[n.kind] || KIND_COLORS.file }} />
            <Typography variant="body2">{n.name}</Typography>
            <Typography variant="caption" color="text.secondary">{n.kind}</Typography>
          </Stack>
        ))}
        {!items.length && (
          <Typography variant="caption" color="text.secondary">None</Typography>
        )}
      </Stack>
    </Paper>
  );
}

function FocusPane({ selectedId, graph, depth, setDepth }) {
  const node = selectedId ? graph.byId.get(selectedId) : null;

  const { imports, callers } = useMemo(() => {
    if (!node) return { imports: [], callers: [] };
    const byId = graph.byId;

    function gatherDeps(startIds, direction, d) {
      const result = new Set();
      const queue = startIds.map((id) => ({ id, lvl: 1 }));
      while (queue.length) {
        const { id, lvl } = queue.shift();
        if (lvl > d || result.has(id)) continue;
        result.add(id);
        const next = direction === "out"
          ? graph.edges.filter((e) => e.source === id).map((e) => e.target)
          : graph.edges.filter((e) => e.target === id).map((e) => e.source);
        next.forEach((nxt) => queue.push({ id: nxt, lvl: lvl + 1 }));
      }
      return Array.from(result).map((id) => byId.get(id)).filter(Boolean);
    }

    const out1 = graph.edges.filter((e) => e.source === node.id).map((e) => e.target);
    const in1 = graph.edges.filter((e) => e.target === node.id).map((e) => e.source);

    return { imports: gatherDeps(out1, "out", depth), callers: gatherDeps(in1, "in", depth) };
  }, [selectedId, graph, depth]);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%", overflow: "hidden" }}>
      {!node ? (
        <Box sx={{ color: "text.secondary" }}>Select a file on the left to see its relationships.</Box>
      ) : (
        <Stack spacing={2} sx={{ height: "100%" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{node.name}</Typography>
            <Tooltip title={node.path}><InfoOutlined fontSize="small"/></Tooltip>
            <Box sx={{ ml: "auto" }} />
            <Typography variant="body2">Depth</Typography>
            <Button size="small" variant={depth===1?"contained":"text"} onClick={()=>setDepth(1)}>1</Button>
            <Button size="small" variant={depth===2?"contained":"text"} onClick={()=>setDepth(2)}>2</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">{node.path}</Typography>

          <RadialGraph center={node} imports={imports} callers={callers} />

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <ListBox title={`Imports (${imports.length})`} items={imports} />
            <ListBox title={`Used by (${callers.length})`} items={callers} />
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}

function CerberusTree() {
  const { graph, loading, error } = useGraphData();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [depth, setDepth] = useState(1);
  const [activeKinds, setActiveKinds] = useState(new Set(ALL_KINDS));

  const clientFiles = useMemo(() => (graph ? graph.nodes.filter((n) => n.side === "client") : []), [graph]);
  const serverFiles = useMemo(() => (graph ? graph.nodes.filter((n) => n.side === "server") : []), [graph]);
  const rootFiles   = useMemo(() => (graph ? graph.nodes.filter((n) => n.side === "root")   : []), [graph]);

  const clientTree = useMemo(() => (graph ? buildTree(clientFiles, "client") : null), [graph, clientFiles.length]);
  const serverTree = useMemo(() => (graph ? buildTree(serverFiles, "server") : null), [graph, serverFiles.length]);
  const rootTree   = useMemo(() => (graph ? buildTree(rootFiles,   "root")   : null), [graph, rootFiles.length]);

  const toggleKind = (k) => {
    const s = new Set(activeKinds);
    s.has(k) ? s.delete(k) : s.add(k);
    setActiveKinds(s);
  };
  useEffect(() => { if (query) setSelectedId(""); }, [query]);

  return (
    <Box sx={{ p: 2, height: 640 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Tree & Paths</Typography>
          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
          <TextField
            size="small"
            placeholder="Search file path or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small"/> , endAdornment: query ? <IconButton size="small" onClick={()=>setQuery("")}><ClearIcon fontSize="small"/></IconButton> : null }}
            sx={{ width: 380 }}
          />
          <Box sx={{ flex: 1 }} />
          {ALL_KINDS.map((k) => (
            <Chip
              key={k}
              label={k}
              onClick={() => toggleKind(k)}
              variant={activeKinds.has(k) ? "filled" : "outlined"}
              sx={{ bgcolor: activeKinds.has(k) ? KIND_COLORS[k] : "transparent", borderColor: KIND_COLORS[k] }}
            />
          ))}
        </Stack>

        {loading && <Typography variant="body2">Loading…</Typography>}
        {error && <Alert severity="warning">{String(error)}</Alert>}

        {graph && (
          <Stack direction="row" spacing={2} sx={{ height: "100%" }}>
            <Box sx={{ width: "26%", minWidth: 240, height: "100%" }}>
              <TreePane title="Client" root={clientTree} selectedId={selectedId} onSelect={setSelectedId} activeKinds={activeKinds} query={query} />
            </Box>
            <Box sx={{ width: "26%", minWidth: 240, height: "100%" }}>
              <TreePane title="Server" root={serverTree} selectedId={selectedId} onSelect={setSelectedId} activeKinds={activeKinds} query={query} />
            </Box>
            <Box sx={{ width: "26%", minWidth: 240, height: "100%" }}>
              <TreePane title="Root"   root={rootTree}   selectedId={selectedId} onSelect={setSelectedId} activeKinds={activeKinds} query={query} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 360, height: "100%" }}>
              <FocusPane selectedId={selectedId} graph={graph} depth={depth} setDepth={setDepth} />
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

/* =============================== OLD CHECKS TAB =============================== */
const STATUS_COLORS = { pass: "success", warn: "warning", fail: "error" };
function StatusChip({ status, size = "small" }) {
  const map = { pass: "✅ PASS", warn: "⚠️ WARN", fail: "❌ FAIL" };
  return <Chip size={size} color={STATUS_COLORS[status]} label={map[status]} />;
}
function worstStatus(checks = []) {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}

export default function ChowkidarDashboard() {
  // checks tab state
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(0);

  // actions modal
  const [activeCard, setActiveCard] = useState(null);
  const openActions = useCallback((filePath, checkObj) => {
    if (checkObj?.actions?.length) setActiveCard({ file: filePath, ...checkObj });
  }, []);
  const closeActions = useCallback(() => setActiveCard(null), []);

  const fetchResults = async () => {
    try {
      setFetching(true);
      const res = await api.get("/chowkidar");
      setData(res.data);
    } catch (e) {
      console.error("Failed to load chowkidar results", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const id = setInterval(fetchResults, 5000);
    return () => clearInterval(id);
  }, []);

  const files = useMemo(() => {
    if (!data?.results) return [];
    return Object.entries(data.results).map(([file, checks]) => ({ file, checks, worst: worstStatus(checks) }));
  }, [data]);

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (q && !f.file.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter !== "all" && f.worst !== filter) return false;
      return true;
    });
  }, [files, q, filter]);

  const totals = data?.summary?.totals || { pass: 0, warn: 0, fail: 0 };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Stack spacing={0.2}>
          <Typography variant="h5" fontWeight={700}>Cerberus</Typography>
          <Typography variant="body2" color="text.secondary">
            Last scan: {data?.scannedAt ? new Date(data.scannedAt).toLocaleString() : "—"}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip color="success" label={`Pass: ${totals.pass || 0}`} />
          <Chip color="warning" label={`Warn: ${totals.warn || 0}`} />
          <Chip color="error" label={`Fail: ${totals.fail || 0}`} />
          <Tooltip title="Refresh results"><IconButton onClick={fetchResults}><RefreshIcon /></IconButton></Tooltip>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Checks" />
        <Tab label="Graph" />
      </Tabs>

      {tab === 0 && (
        <>
          <Card variant="outlined" sx={{ mb: 2 }}>
            {fetching && <LinearProgress />}
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Search filename"
                  placeholder="e.g. server/routes/approvals.js"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  fullWidth
                />
                <Select value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 180 }}>
                  <MenuItem value="all">Show: All</MenuItem>
                  <MenuItem value="fail">❌ Fail</MenuItem>
                  <MenuItem value="warn">⚠️ Warn</MenuItem>
                  <MenuItem value="pass">✅ Pass</MenuItem>
                </Select>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            {filtered.length === 0 && (
              <Card variant="outlined"><CardContent><Typography>No files match your filter/search.</Typography></CardContent></Card>
            )}

            {filtered.map(({ file, checks, worst }) => (
              <Card key={file} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    spacing={1}
                    mb={1}
                  >
                    <Typography variant="subtitle1" sx={{ wordBreak: "break-all" }}>{file}</Typography>
                    <StatusChip status={worst} />
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 1.5 }}>
                    {checks.map((c, idx) => (
                      <Card
                        key={`${file}-${idx}`}
                        variant="outlined"
                        sx={{ p: 1, cursor: c?.actions?.length ? "pointer" : "default" }}
                        onClick={() => openActions(file, c)}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" fontWeight={700}>{c.check}</Typography>
                          <StatusChip status={c.status} />
                          {c.message && (<Typography variant="caption" color="text.secondary">{c.message}</Typography>)}
                          {c?.actions?.length > 0 && (<Typography variant="caption" color="primary">View actions…</Typography>)}
                        </Stack>
                      </Card>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {tab === 1 && (
        <Card variant="outlined">
          <CardContent>
            {/* NEW GRAPH VIEW here */}
            <CerberusTree />
          </CardContent>
        </Card>
      )}

      {/* Actions Modal */}
      <Dialog open={!!activeCard} onClose={closeActions} maxWidth="md" fullWidth>
        <DialogTitle>{activeCard ? `${activeCard.check} — ${activeCard.file}` : "Actions"}</DialogTitle>
        <DialogContent dividers>
          {activeCard?.actions?.length ? (
            <List dense>
              {activeCard.actions.map((a, i) => (
                <ListItem key={i} alignItems="flex-start" sx={{ display: "block" }}>
                  <ListItemText
                    primary={<Typography fontWeight={600}>{a.title}</Typography>}
                    secondary={
                      <>
                        {a.description && <Typography variant="body2" sx={{ mb: 1 }}>{a.description}</Typography>}
                        {a.snippet && (
                          <Box component="pre" sx={{ bgcolor: "#f6f8fa", p: 1.5, borderRadius: 1, overflow: "auto", fontSize: "0.8rem", border: "1px solid #eaecef" }}>
                            <code>{a.snippet}</code>
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">No suggested actions for this check.</Typography>
          )}
        </DialogContent>
        <DialogActions><Button onClick={closeActions}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}




//NEW GRAPH VIEW ONLY NO CHECK
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Box,
//   Stack,
//   Typography,
//   TextField,
//   Chip,
//   Paper,
//   Divider,
//   Tooltip,
//   IconButton,
//   Button,
//   List,
//   ListItemButton,
//   ListItemText,
//   Collapse,
// } from "@mui/material";
// import SearchIcon from "@mui/icons-material/Search";
// import ClearIcon from "@mui/icons-material/Clear";
// import InfoOutlined from "@mui/icons-material/InfoOutlined";
// import ExpandLess from "@mui/icons-material/ExpandLess";
// import ExpandMore from "@mui/icons-material/ExpandMore";

// /**
//  * CerberusTree.jsx — zero-dependency Tree (pure MUI v5)
//  * Folder trees for Client/Server/Root + a focus pane for deps/callers.
//  * No @mui/lab or @mui/x-tree-view required.
//  */

// const KIND_COLORS = {
//   file: "#CBD5E0",
//   route: "#f6ad55",
//   controller: "#fbd38d",
//   middleware: "#9ae6b4",
//   helper: "#b794f4",
//   component: "#f687b3",
//   page: "#63b3ed",
//   util: "#e2e8f0",
// };

// // Include "file" so root-level files & uncategorized files show up
// const ALL_KINDS = ["file", "route", "controller", "middleware", "helper", "component", "page", "util"];

// function useGraphData() {
//   const [raw, setRaw] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         setLoading(true);
//         const res = await fetch("/api/chowkidar/graph");
//         const data = await res.json();
//         if (!alive) return;
//         setRaw(data);
//       } catch (e) {
//         setError(e?.message || "Failed to load graph data");
//       } finally {
//         setLoading(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, []);

//   const graph = useMemo(() => (raw ? normalizeRaw(raw) : null), [raw]);
//   return { graph, loading, error };
// }

// function detectSide(p) {
//   if (p.startsWith("client/") || p.startsWith("frontend/")) return "client";
//   if (p.startsWith("server/") || p.startsWith("backend/")) return "server";
//   return "root"; // anything else (e.g., agent/, scripts/, config files)
// }

// function normalizeRaw(raw) {
//   const nodes = (raw.nodes || []).map((n) => ({
//     id: n.id || n.path,
//     path: (n.path || n.id || "").replace(/\\/g, "/"),
//     kind: n.kind || "file",
//   }));
//   const byId = new Map(nodes.map((n) => [n.id, n]));
//   const edges = (raw.edges || [])
//     .filter((e) => e.source && e.target)
//     .map((e, i) => ({ id: e.id || `e${i}`, source: e.source, target: e.target, type: e.type || "import" }));

//   for (const n of nodes) {
//     const p = n.path;
//     n.side = detectSide(p);
//     n.name = p.split("/").pop();
//   }
//   return { nodes, edges, byId };
// }

// function buildTree(files, side) {
//   const root = { id: `${side}:root`, name: side, path: side, dir: true, children: [] };
//   const index = new Map([[root.path, root]]);

//   const ensureDir = (accPath) => {
//     if (index.has(accPath)) return index.get(accPath);
//     const parentPath = accPath.split("/").slice(0, -1).join("/") || side;
//     const name = accPath.split("/").pop();
//     const node = { id: `dir:${accPath}`, name, path: accPath, dir: true, children: [] };
//     const parent = ensureDir(parentPath);
//     parent.children.push(node);
//     index.set(accPath, node);
//     return node;
//   };

//   files.forEach((f) => {
//     const rel = f.path;
//     const parts = rel.split("/");
//     const idx = parts.findIndex((p) => ["client", "frontend", "server", "backend"].includes(p));
//     const after = idx >= 0 ? parts.slice(idx + 1) : parts; // in root, we keep full relative path
//     let acc = side;
//     for (let i = 0; i < after.length - 1; i++) {
//       acc += "/" + after[i];
//       ensureDir(acc);
//     }
//     const parent = index.get(acc) || root;
//     parent.children.push({ id: f.id, name: after[after.length - 1], path: f.path, kind: f.kind, side: f.side, dir: false });
//   });

//   const sortRec = (node) => {
//     if (!node.children) return;
//     node.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
//     node.children.forEach(sortRec);
//   };
//   sortRec(root);
//   return root;
// }

// function findPath(root, predicate) {
//   const path = [];
//   function dfs(node) {
//     path.push(node);
//     if (predicate(node)) return true;
//     if (node.children) {
//       for (const c of node.children) if (dfs(c)) return true;
//     }
//     path.pop();
//     return false;
//   }
//   dfs(root);
//   return path;
// }

// function MuiListTree({ node, expanded, setExpanded, onSelect, activeKinds, query }) {
//   const isDir = !!node.dir;
//   const open = expanded.has(node.id);
//   const visible = isDir || activeKinds.has(node.kind);
//   if (!visible) return null;

//   const toggle = () => {
//     const next = new Set(expanded);
//     open ? next.delete(node.id) : next.add(node.id);
//     setExpanded(next);
//   };

//   const labelChip = (
//     <Tooltip title={node.path || node.name} placement="right" arrow>
//       <Box
//         sx={{
//           px: 1,
//           py: 0.3,
//           borderRadius: 1.5,
//           bgcolor: isDir ? "transparent" : KIND_COLORS[node.kind] || KIND_COLORS.file,
//           border: isDir ? "none" : "1px solid rgba(0,0,0,0.1)",
//           fontSize: 12,
//         }}
//       >
//         {node.name}
//       </Box>
//     </Tooltip>
//   );

//   const match = query && node.path?.toLowerCase().includes(query.toLowerCase());

//   return (
//     <>
//       <ListItemButton dense onClick={isDir ? toggle : () => onSelect(node.id)} sx={{ pl: isDir ? 1 : 2 }}>
//         <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
//           {isDir ? (open ? <ExpandLess fontSize="small"/> : <ExpandMore fontSize="small"/>) : null}
//           {labelChip}
//           {!isDir && (
//             <Typography variant="caption" color="text.secondary">{node.kind || "file"}</Typography>
//           )}
//           {match && <Typography variant="caption" sx={{ ml: "auto", color: "primary.main" }}>match</Typography>}
//         </Stack>
//       </ListItemButton>
//       {isDir && (
//         <Collapse in={open} timeout="auto" unmountOnExit>
//           <List disablePadding sx={{ pl: 2 }}>
//             {node.children?.map((c) => (
//               <MuiListTree
//                 key={c.id}
//                 node={c}
//                 expanded={expanded}
//                 setExpanded={setExpanded}
//                 onSelect={onSelect}
//                 activeKinds={activeKinds}
//                 query={query}
//               />
//             ))}
//           </List>
//         </Collapse>
//       )}
//     </>
//   );
// }

// function TreePane({ title, root, selectedId, onSelect, activeKinds, query }) {
//   const [expanded, setExpanded] = useState(new Set());

//   // expand root folder by default
//   useEffect(() => {
//     if (root) setExpanded(new Set([root.id]));
//   }, [root?.id]);

//   // auto-expand to search match or selection
//   useEffect(() => {
//     if (!root || (!query && !selectedId)) return;
//     const targetPath = findPath(
//       root,
//       (n) => (!!query && n.path?.toLowerCase().includes(query.toLowerCase())) || n.id === selectedId
//     );
//     if (targetPath.length) {
//       const toExpand = targetPath.slice(0, -1).map((n) => n.id);
//       setExpanded((prev) => new Set([...Array.from(prev), ...toExpand]));
//     }
//   }, [query, selectedId, root]);

//   return (
//     <Paper variant="outlined" sx={{ p: 1.5, height: "100%", overflow: "auto" }}>
//       <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
//       {root && (
//         <List dense>
//           <MuiListTree
//             node={root}
//             expanded={expanded}
//             setExpanded={setExpanded}
//             onSelect={onSelect}
//             activeKinds={activeKinds}
//             query={query}
//           />
//         </List>
//       )}
//     </Paper>
//   );
// }

// function FocusPane({ selectedId, graph, depth, setDepth }) {
//   const node = selectedId ? graph.byId.get(selectedId) : null;

//   const { imports, callers } = useMemo(() => {
//     if (!node) return { imports: [], callers: [] };
//     const imports = [];
//     const callers = [];
//     const byId = graph.byId;

//     function gatherDeps(startIds, direction, d) {
//       const result = new Set();
//       const queue = startIds.map((id) => ({ id, lvl: 1 }));
//       while (queue.length) {
//         const { id, lvl } = queue.shift();
//         if (lvl > d || result.has(id)) continue;
//         result.add(id);
//         const next = direction === "out"
//           ? graph.edges.filter((e) => e.source === id).map((e) => e.target)
//           : graph.edges.filter((e) => e.target === id).map((e) => e.source);
//         next.forEach((nxt) => queue.push({ id: nxt, lvl: lvl + 1 }));
//       }
//       return Array.from(result).map((id) => byId.get(id)).filter(Boolean);
//     }

//     const out1 = graph.edges.filter((e) => e.source === node.id).map((e) => e.target);
//     const in1 = graph.edges.filter((e) => e.target === node.id).map((e) => e.source);

//     return { imports: gatherDeps(out1, "out", depth), callers: gatherDeps(in1, "in", depth) };
//   }, [node, graph, depth]);

//   return (
//     <Paper variant="outlined" sx={{ p: 2, height: "100%", overflow: "hidden" }}>
//       {!node ? (
//         <Box sx={{ color: "text.secondary" }}>Select a file on the left to see its relationships.</Box>
//       ) : (
//         <Stack spacing={2} sx={{ height: "100%" }}>
//           <Stack direction="row" alignItems="center" spacing={1}>
//             <Typography variant="h6" sx={{ fontWeight: 700 }}>{node.name}</Typography>
//             <Tooltip title={node.path}><InfoOutlined fontSize="small"/></Tooltip>
//             <Box sx={{ ml: "auto" }} />
//             <Typography variant="body2">Depth</Typography>
//             <Button size="small" variant={depth===1?"contained":"text"} onClick={()=>setDepth(1)}>1</Button>
//             <Button size="small" variant={depth===2?"contained":"text"} onClick={()=>setDepth(2)}>2</Button>
//           </Stack>
//           <Typography variant="caption" color="text.secondary">{node.path}</Typography>

//           <RadialGraph center={node} imports={imports} callers={callers} />

//           <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
//             <ListBox title={`Imports (${imports.length})`} items={imports} />
//             <ListBox title={`Used by (${callers.length})`} items={callers} />
//           </Stack>
//         </Stack>
//       )}
//     </Paper>
//   );
// }

// function ListBox({ title, items }) {
//   return (
//     <Paper variant="outlined" sx={{ p: 1.25, flex: 1, minHeight: 120, overflow: "auto" }}>
//       <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
//       <Stack spacing={0.5}>
//         {items.map((n) => (
//           <Stack key={n.id} direction="row" spacing={1} alignItems="center">
//             <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: KIND_COLORS[n.kind] || KIND_COLORS.file }} />
//             <Typography variant="body2">{n.name}</Typography>
//             <Typography variant="caption" color="text.secondary">{n.kind}</Typography>
//           </Stack>
//         ))}
//         {!items.length && (
//           <Typography variant="caption" color="text.secondary">None</Typography>
//         )}
//       </Stack>
//     </Paper>
//   );
// }

// function RadialGraph({ center, imports, callers }) {
//   const W = 720, H = 260;
//   const cx = W / 2, cy = H / 2;
//   const r1 = 60, r2 = 110;

//   const place = (count, side) => {
//     const spread = Math.max(1, count);
//     return (idx) => {
//       const t = (idx + 1) / (spread + 1);
//       const angle = (Math.PI * (0.8 + 0.4 * t)) * (side === -1 ? 1 : -1);
//       return { x: cx + r2 * Math.cos(angle), y: cy + r2 * Math.sin(angle) };
//     };
//   };

//   const posCall = place(callers.length, -1);
//   const posImp = place(imports.length, +1);

//   const NodeBox = ({ x, y, label, kind }) => (
//     <g transform={`translate(${x - 48},${y - 12})`}>
//       <rect width={96} height={24} rx={8} ry={8} fill={KIND_COLORS[kind] || KIND_COLORS.file} stroke="rgba(0,0,0,0.15)" />
//       <text x={48} y={15} textAnchor="middle" fontSize="11">{label}</text>
//     </g>
//   );

//   return (
//     <Paper variant="outlined" sx={{ p: 1, overflow: "hidden" }}>
//       <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220">
//         <g>
//           <circle cx={cx} cy={cy} r={r1} fill={KIND_COLORS[center.kind] || KIND_COLORS.file} stroke="rgba(0,0,0,0.2)" />
//           <text x={cx} y={cy+4} textAnchor="middle" fontSize="12" fontWeight={600}>{center.name}</text>
//         </g>
//         {callers.map((n, i) => {
//           const p = posCall(i);
//           return (
//             <g key={n.id}>
//               <path d={`M ${p.x} ${p.y} Q ${cx - 30} ${cy} ${cx - r1} ${cy}`} stroke="#CBD5E0" fill="none" />
//               <NodeBox x={p.x} y={p.y} label={n.name} kind={n.kind} />
//             </g>
//           );
//         })}
//         {imports.map((n, i) => {
//           const p = posImp(i);
//           return (
//             <g key={n.id}>
//               <path d={`M ${cx + r1} ${cy} Q ${cx + 30} ${cy} ${p.x} ${p.y}`} stroke="#CBD5E0" fill="none" />
//               <NodeBox x={p.x} y={p.y} label={n.name} kind={n.kind} />
//             </g>
//           );
//         })}
//       </svg>
//     </Paper>
//   );
// }

// export default function CerberusTree() {
//   const { graph, loading, error } = useGraphData();
//   const [query, setQuery] = useState("");
//   const [selectedId, setSelectedId] = useState("");
//   const [depth, setDepth] = useState(1);
//   const [activeKinds, setActiveKinds] = useState(new Set(ALL_KINDS));

//   const clientFiles = useMemo(() => (graph ? graph.nodes.filter((n) => n.side === "client") : []), [graph]);
//   const serverFiles = useMemo(() => (graph ? graph.nodes.filter((n) => n.side === "server") : []), [graph]);
//   const rootFiles   = useMemo(() => (graph ? graph.nodes.filter((n) => n.side === "root")   : []), [graph]);

//   const clientTree = useMemo(() => (graph ? buildTree(clientFiles, "client") : null), [graph, clientFiles.length]);
//   const serverTree = useMemo(() => (graph ? buildTree(serverFiles, "server") : null), [graph, serverFiles.length]);
//   const rootTree   = useMemo(() => (graph ? buildTree(rootFiles,   "root")   : null), [graph, rootFiles.length]);

//   const toggleKind = (k) => {
//     const s = new Set(activeKinds);
//     s.has(k) ? s.delete(k) : s.add(k);
//     setActiveKinds(s);
//   };

//   useEffect(() => {
//     if (query) setSelectedId("");
//   }, [query]);

//   return (
//     <Box sx={{ p: 2, height: "calc(100vh - 120px)" }}>
//       <Stack spacing={1.5}>
//         <Stack direction="row" spacing={1} alignItems="center">
//           <Typography variant="h5" sx={{ fontWeight: 800 }}>Cerberus</Typography>
//           <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
//           <TextField
//             size="small"
//             placeholder="Search file path or name…"
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             InputProps={{ startAdornment: <SearchIcon fontSize="small"/> , endAdornment: query ? <IconButton size="small" onClick={()=>setQuery("")}><ClearIcon fontSize="small"/></IconButton> : null }}
//             sx={{ width: 380 }}
//           />
//           <Box sx={{ flex: 1 }} />
//           {ALL_KINDS.map((k) => (
//             <Chip
//               key={k}
//               label={k}
//               onClick={() => toggleKind(k)}
//               variant={activeKinds.has(k) ? "filled" : "outlined"}
//               sx={{ bgcolor: activeKinds.has(k) ? KIND_COLORS[k] : "transparent", borderColor: KIND_COLORS[k] }}
//             />
//           ))}
//         </Stack>

//         {loading && <Typography variant="body2">Loading…</Typography>}
//         {error && <Typography color="error">{String(error)}</Typography>}

//         {graph && (
//           <Stack direction="row" spacing={2} sx={{ height: "100%" }}>
//             <Box sx={{ width: "26%", minWidth: 240, height: "100%" }}>
//               <TreePane
//                 title="Client"
//                 root={clientTree}
//                 selectedId={selectedId}
//                 onSelect={setSelectedId}
//                 activeKinds={activeKinds}
//                 query={query}
//               />
//             </Box>
//             <Box sx={{ width: "26%", minWidth: 240, height: "100%" }}>
//               <TreePane
//                 title="Server"
//                 root={serverTree}
//                 selectedId={selectedId}
//                 onSelect={setSelectedId}
//                 activeKinds={activeKinds}
//                 query={query}
//               />
//             </Box>
//             <Box sx={{ width: "26%", minWidth: 240, height: "100%" }}>
//               <TreePane
//                 title="Root"
//                 root={rootTree}
//                 selectedId={selectedId}
//                 onSelect={setSelectedId}
//                 activeKinds={activeKinds}
//                 query={query}
//               />
//             </Box>
//             <Box sx={{ flex: 1, minWidth: 360, height: "100%" }}>
//               <FocusPane selectedId={selectedId} graph={graph} depth={depth} setDepth={setDepth} />
//             </Box>
//           </Stack>
//         )}
//       </Stack>
//     </Box>
//   );
// }
//NEW GRAPH VIEW ONLY NO CHECK








// // src/pages/ChowkidarDashboard.jsx ---OLD CHECK TAB AND OLD GRAPH DIRTY VIEW
// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import {
//   Box, Stack, Typography, TextField, Select, MenuItem, Chip, Card,
//   CardContent, Divider, IconButton, Tooltip, LinearProgress, Dialog,
//   DialogTitle, DialogContent, DialogActions, Button, List, ListItem,
//   ListItemText, Tabs, Tab, Alert
// } from "@mui/material";
// import RefreshIcon from "@mui/icons-material/Refresh";
// import CytoscapeComponent from "react-cytoscapejs";
// import api from "../services/api"; // ← adjust if your path differs

// const STATUS_COLORS = { pass: "success", warn: "warning", fail: "error" };
// function StatusChip({ status, size = "small" }) {
//   const map = { pass: "✅ PASS", warn: "⚠️ WARN", fail: "❌ FAIL" };
//   return <Chip size={size} color={STATUS_COLORS[status]} label={map[status]} />;
// }
// function worstStatus(checks = []) {
//   if (checks.some((c) => c.status === "fail")) return "fail";
//   if (checks.some((c) => c.status === "warn")) return "warn";
//   return "pass";
// }

// export default function ChowkidarDashboard() {
//   const [data, setData] = useState(null);
//   const [fetching, setFetching] = useState(false);
//   const [filter, setFilter] = useState("all");
//   const [q, setQ] = useState("");

//   // actions modal
//   const [activeCard, setActiveCard] = useState(null);
//   const openActions = useCallback((filePath, checkObj) => {
//     if (checkObj?.actions?.length) setActiveCard({ file: filePath, ...checkObj });
//   }, []);
//   const closeActions = useCallback(() => setActiveCard(null), []);

//   // graph
//   const [graph, setGraph] = useState({ nodes: [], edges: [], errors: [] });
//   const [graphErr, setGraphErr] = useState('');
//   const [tab, setTab] = useState(0);
//   const [graphError, setGraphError] = useState("");

//   const fetchResults = async () => {
//     try {
//       setFetching(true);
//       const res = await api.get("/chowkidar");
//       setData(res.data);
//     } catch (e) {
//       console.error("Failed to load chowkidar results", e);
//     } finally {
//       setFetching(false);
//     }
//   };

//   const fetchGraph = useCallback(async () => {
//     try {
//       setGraphError("");
//       const res = await api.get("/chowkidar/graph");
//       setGraph(res.data || { nodes: [], edges: [], errors: [] });
//       if (Array.isArray(res.data?.errors) && res.data.errors.length) {
//         setGraphError(`Parsed with ${res.data.errors.length} issue(s). See agent/graph-errors.json.`);
//       }
//     } catch (e) {
//       console.error("Failed to load graph:", e);
//       setGraph({ nodes: [], edges: [], errors: [] });
//       setGraphError(e?.response?.data?.error || e.message || "Failed to load graph");
//     }
//   }, []);

//   useEffect(() => {
//     fetchResults();
//     const id = setInterval(fetchResults, 5000);
//     return () => clearInterval(id);
//   }, []);


//   // fetch graph once (or whenever you want – e.g., after a rescan)
// useEffect(() => {
//   let cancelled = false;
//   (async () => {
//     try {
//       setGraphErr('');
//       const { data } = await api.get('/chowkidar/graph', {
//         params: { t: Date.now() },       // bust caches
//         headers: { 'Cache-Control': 'no-cache' }
//       });
//       if (!cancelled) setGraph(Array.isArray(data?.nodes) ? data : { nodes: [], edges: [] });
//     } catch (e) {
//       if (!cancelled) setGraphErr(e?.response?.data?.error || e.message || 'Network Error');
//     }
//   })();
//   return () => { cancelled = true; };
// }, []);

//   useEffect(() => {
//     // load once on mount
//     fetchGraph();
//   }, [fetchGraph]);

//   const files = useMemo(() => {
//     if (!data?.results) return [];
//     return Object.entries(data.results).map(([file, checks]) => ({
//       file, checks, worst: worstStatus(checks),
//     }));
//   }, [data]);

//   const filtered = useMemo(() => {
//     return files.filter((f) => {
//       if (q && !f.file.toLowerCase().includes(q.toLowerCase())) return false;
//       if (filter !== "all" && f.worst !== filter) return false;
//       return true;
//     });
//   }, [files, q, filter]);

//   const totals = data?.summary?.totals || { pass: 0, warn: 0, fail: 0 };

//   // --- Cytoscape mapping ---
//   const cyElements = useMemo(() => {
//     const nodeEls = (graph.nodes || []).map((n) => ({
//       data: { id: n.id, label: n.label || n.id, kind: n.kind || 'file', path: n.path || '' },
//     }));
//     const edgeEls = (graph.edges || []).map((e, i) => ({
//       data: {
//         id: e.id || `${e.source}->${e.target}-${e.type || i}`,
//         source: e.source, target: e.target, type: e.type || 'ref'
//       },
//     }));
//     return [...nodeEls, ...edgeEls];
//   }, [graph]);

//   const cyStyle = [
//     {
//       selector: 'node',
//       style: {
//         'label': 'data(label)',
//         'font-size': 10,
//         'text-wrap': 'wrap',
//         'text-max-width': 140,
//         'background-color': '#90caf9',
//         'border-width': 1,
//         'border-color': '#1976d2',
//         'width': 'label',
//         'height': 'label',
//         'padding': '6px',
//         'shape': 'round-rectangle',
//       }
//     },
//     { selector: 'node[kind = "route"]',      style: { 'background-color': '#ffcc80', 'border-color': '#fb8c00' } },
//     { selector: 'node[kind = "controller"]', style: { 'background-color': '#ffe082', 'border-color': '#f9a825' } },
//     { selector: 'node[kind = "middleware"]', style: { 'background-color': '#c5e1a5', 'border-color': '#7cb342' } },
//     { selector: 'node[kind = "helper"]',     style: { 'background-color': '#b39ddb', 'border-color': '#5e35b1' } },
//     { selector: 'node[kind = "component"]',  style: { 'background-color': '#f48fb1', 'border-color': '#c2185b' } },
//     { selector: 'node[kind = "page"]',       style: { 'background-color': '#80cbc4', 'border-color': '#00897b' } },
//     { selector: 'node[kind = "util"]',       style: { 'background-color': '#eeeeee', 'border-color': '#9e9e9e' } },

//     {
//       selector: 'edge',
//       style: {
//         'width': 1.5,
//         'line-color': '#90a4ae',
//         'target-arrow-color': '#90a4ae',
//         'curve-style': 'bezier',
//         'target-arrow-shape': 'triangle',
//       }
//     },
//   ];

//   return (
//     <Box p={3}>
//       <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
//         <Stack spacing={0.2}>
//           <Typography variant="h5" fontWeight={700}>Cerberus</Typography>
//           <Typography variant="body2" color="text.secondary">
//             Last scan: {data?.scannedAt ? new Date(data.scannedAt).toLocaleString() : "—"}
//           </Typography>
//         </Stack>
//         <Stack direction="row" spacing={1} alignItems="center">
//           <Chip color="success" label={`Pass: ${totals.pass || 0}`} />
//           <Chip color="warning" label={`Warn: ${totals.warn || 0}`} />
//           <Chip color="error" label={`Fail: ${totals.fail || 0}`} />
//           <Tooltip title="Refresh results">
//             <IconButton onClick={fetchResults}><RefreshIcon /></IconButton>
//           </Tooltip>
//           <Tooltip title="Refresh graph">
//             <IconButton onClick={fetchGraph}><RefreshIcon /></IconButton>
//           </Tooltip>
//         </Stack>
//       </Stack>

//       <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
//         <Tab label="Checks" />
//         <Tab label="Graph" />
//       </Tabs>

//       {tab === 0 && (
//         <>
//           <Card variant="outlined" sx={{ mb: 2 }}>
//             {fetching && <LinearProgress />}
//             <CardContent>
//               <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
//                 <TextField
//                   label="Search filename"
//                   placeholder="e.g. server/routes/approvals.js"
//                   value={q}
//                   onChange={(e) => setQ(e.target.value)}
//                   fullWidth
//                 />
//                 <Select value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 180 }}>
//                   <MenuItem value="all">Show: All</MenuItem>
//                   <MenuItem value="fail">❌ Fail</MenuItem>
//                   <MenuItem value="warn">⚠️ Warn</MenuItem>
//                   <MenuItem value="pass">✅ Pass</MenuItem>
//                 </Select>
//               </Stack>
//             </CardContent>
//           </Card>

//           <Stack spacing={2}>
//             {filtered.length === 0 && (
//               <Card variant="outlined">
//                 <CardContent><Typography>No files match your filter/search.</Typography></CardContent>
//               </Card>
//             )}

//             {filtered.map(({ file, checks, worst }) => (
//               <Card key={file} variant="outlined">
//                 <CardContent>
//                   <Stack
//                     direction={{ xs: "column", sm: "row" }}
//                     alignItems={{ xs: "flex-start", sm: "center" }}
//                     justifyContent="space-between"
//                     spacing={1}
//                     mb={1}
//                   >
//                     <Typography variant="subtitle1" sx={{ wordBreak: "break-all" }}>{file}</Typography>
//                     <StatusChip status={worst} />
//                   </Stack>
//                   <Divider sx={{ my: 1 }} />
//                   <Box
//                     sx={{
//                       display: "grid",
//                       gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
//                       gap: 1.5,
//                     }}
//                   >
//                     {checks.map((c, idx) => (
//                       <Card
//                         key={`${file}-${idx}`}
//                         variant="outlined"
//                         sx={{ p: 1, cursor: c?.actions?.length ? "pointer" : "default" }}
//                         onClick={() => openActions(file, c)}
//                       >
//                         <Stack spacing={0.5}>
//                           <Typography variant="subtitle2" fontWeight={700}>{c.check}</Typography>
//                           <StatusChip status={c.status} />
//                           {c.message && (
//                             <Typography variant="caption" color="text.secondary">{c.message}</Typography>
//                           )}
//                           {c?.actions?.length > 0 && (
//                             <Typography variant="caption" color="primary">View actions…</Typography>
//                           )}
//                         </Stack>
//                       </Card>
//                     ))}
//                   </Box>
//                 </CardContent>
//               </Card>
//             ))}
//           </Stack>
//         </>
//       )}

//       {tab === 1 && (
//         <Stack spacing={1}>
//           {graphError && <Alert severity="warning">{graphError}</Alert>}

//           {/* Legend */}
//           <Card variant="outlined">
//             <CardContent>
//               <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
//                 <Chip label="file" sx={{ bgcolor: '#90caf9', borderColor: '#1976d2' }} />
//                 <Chip label="route" sx={{ bgcolor: '#ffcc80', borderColor: '#fb8c00' }} />
//                 <Chip label="controller" sx={{ bgcolor: '#ffe082', borderColor: '#f9a825' }} />
//                 <Chip label="middleware" sx={{ bgcolor: '#c5e1a5', borderColor: '#7cb342' }} />
//                 <Chip label="helper" sx={{ bgcolor: '#b39ddb', borderColor: '#5e35b1' }} />
//                 <Chip label="component" sx={{ bgcolor: '#f48fb1', borderColor: '#c2185b' }} />
//                 <Chip label="page" sx={{ bgcolor: '#80cbc4', borderColor: '#00897b' }} />
//                 <Chip label="util" sx={{ bgcolor: '#eeeeee', borderColor: '#9e9e9e' }} />
//               </Stack>
//             </CardContent>
//           </Card>

//           {/* Graph */}
//           <Card variant="outlined">
//             <CardContent>
//               <Box sx={{ height: 600 }}>
//                 <CytoscapeComponent
//                   elements={cyElements}
//                   stylesheet={cyStyle}
//                   style={{ width: '100%', height: '100%' }}
//                   layout={{ name: 'cose', animate: false }}
//                   cy={(cy) => {
//                     cy.on('tap', 'node', (evt) => {
//                       const n = evt.target.data();
//                       if (n.path) {
//                         console.log('Node:', n);
//                       }
//                     });
//                   }}
//                 />
//               </Box>
//             </CardContent>
//           </Card>
//         </Stack>
//       )}

//       {/* Actions Modal */}
//       <Dialog open={!!activeCard} onClose={closeActions} maxWidth="md" fullWidth>
//         <DialogTitle>{activeCard ? `${activeCard.check} — ${activeCard.file}` : "Actions"}</DialogTitle>
//         <DialogContent dividers>
//           {activeCard?.actions?.length ? (
//             <List dense>
//               {activeCard.actions.map((a, i) => (
//                 <ListItem key={i} alignItems="flex-start" sx={{ display: "block" }}>
//                   <ListItemText
//                     primary={<Typography fontWeight={600}>{a.title}</Typography>}
//                     secondary={
//                       <>
//                         {a.description && <Typography variant="body2" sx={{ mb: 1 }}>{a.description}</Typography>}
//                         {a.snippet && (
//                           <Box component="pre" sx={{ bgcolor: "#f6f8fa", p: 1.5, borderRadius: 1, overflow: "auto", fontSize: "0.8rem", border: "1px solid #eaecef" }}>
//                             <code>{a.snippet}</code>
//                           </Box>
//                         )}
//                       </>
//                     }
//                   />
//                 </ListItem>
//               ))}
//             </List>
//           ) : (
//             <Typography variant="body2" color="text.secondary">No suggested actions for this check.</Typography>
//           )}
//         </DialogContent>
//         <DialogActions><Button onClick={closeActions}>Close</Button></DialogActions>
//       </Dialog>
//     </Box>
//   );
// }
// // src/pages/ChowkidarDashboard.jsx ---OLD CHECK TAB AND OLD GRAPH DIRTY VIEW


