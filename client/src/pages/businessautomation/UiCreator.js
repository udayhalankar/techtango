// UICreator.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  Divider,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * UICreator – list + canvas editor
 * Table/Form/Text unchanged.
 * Chart is self-contained and will try to fetch rows using chart_config_json.source
 */

/* ==========================
   Renderers
   ========================== */
function TableView({ tableId, width, height }) {
  const [meta, setMeta] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [columns, setColumns] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    const header = 36, controls = 32, rowH = 28;
    const h = Math.max(0, (height || 0) - header - controls - 12);
    const fit = Math.max(3, Math.floor(h / rowH));
    if (fit !== pageSize) setPageSize(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  const debouncedSearchRef = React.useRef(null);
  const setSearchDebounced = (val) => {
    setSearch(val);
    if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
    debouncedSearchRef.current = setTimeout(() => {
      fetchData(1, pageSize, val);
    }, 350);
  };

  const fetchMeta = async () => {
    const m = await api.get(`/table-configs/${tableId}`);
    setMeta(m.data);
  };
  const fetchData = async (p = page, ps = pageSize, s = search) => {
    const d = await api.get(`/table-configs/${tableId}/data`, { params: { page: p, pageSize: ps, search: s } });
    setColumns(d.data.columns || Object.keys(meta?.config || {}));
    setRows(d.data.rows || []);
    setTotal(d.data.total || 0);
    setPage(d.data.page || p);
  };

  React.useEffect(() => {
    let on = true;
    (async () => {
      await fetchMeta();
      if (on) await fetchData(1, pageSize, "");
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  React.useEffect(() => {
    fetchData(page, pageSize, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  if (!meta) return <div style={{ fontSize: 12, opacity: 0.6 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {height > 100 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 4 }}>
          <TextField size="small" placeholder="Search…" value={search} onChange={(e) => setSearchDebounced(e.target.value)} sx={{ flex: 1 }} />
          <FormControl size="small" sx={{ width: 100 }}>
            <InputLabel>Rows</InputLabel>
            <Select label="Rows" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[3, 5, 10, 15, 20, 30].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid #e0e6eb", borderRadius: 6 }}>
        <Table size="small" stickyHeader aria-label="grid-table" sx={{ tableLayout: "fixed", width: "100%" }}>
          <TableHead>
            <TableRow>
              {(columns.length ? columns : Object.keys(meta.config || {})).map((c) => (
                <TableCell key={c} sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(1, columns.length || 1)} sx={{ fontSize: 12, opacity: 0.6 }}>
                  No rows
                </TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <TableRow key={i}>
                {(columns.length ? columns : Object.keys(meta.config || {})).map((c) => (
                  <TableCell key={c} sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {String(r[c] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {height > 80 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, fontSize: 12 }}>
          <div>Rows: {rows.length} / {total}</div>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => fetchData(Math.max(1, page - 1), pageSize, search)} disabled={page <= 1}>Prev</Button>
            <div style={{ padding: "6px 8px" }}>{page}</div>
            <Button size="small" onClick={() => fetchData(page + 1, pageSize, search)} disabled={page * pageSize >= total}>Next</Button>
          </Stack>
        </div>
      )}
    </div>
  );
}

function FormView({ formId, readOnly = true }) {
  const [cfg, setCfg] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [data, setData] = React.useState(null);
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ data: conf }, { data: row }] = await Promise.all([
          api.get(`/form-configs/${formId}`),
          api.get(`/form-configs/${formId}/data`),
        ]);
        if (!active) return;
        setCfg(conf);
        setData(row.row || null);
      } catch (e) {
        if (active) setError(e);
      }
    })();
    return () => { active = false; };
  }, [formId]);

  if (error) return <div style={{ fontSize: 12, color: "#c62828" }}>Failed to load form #{formId}</div>;
  if (!cfg) return <div style={{ fontSize: 12, opacity: 0.6 }}>Loading form…</div>;

  const fields = Array.isArray(cfg.fields_json) ? cfg.fields_json.filter((f) => f?.visible) : [];

  return (
    <div style={{ height: "100%", width: "100%", overflow: "auto" }}>
      <Stack spacing={1} sx={{ p: 1, minWidth: 200 }}>
        {fields.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>No visible fields</div>}
        {fields.map((f, idx) => {
          const type = (f.dataType || "text").toLowerCase();
          const label = f.columnName || f.name || `Field ${idx + 1}`;
          const value = data ? (data[label] ?? data[f.columnName] ?? "") : "";
          const common = { label, size: "small", fullWidth: true, disabled: !!(readOnly || f.readOnly), value };
          if (type === "integer" || type === "number") return <TextField key={idx} type="number" {...common} />;
          if (type === "date") return <TextField key={idx} type="date" {...common} InputLabelProps={{ shrink: true }} />;
          return <TextField key={idx} type="text" {...common} />;
        })}
      </Stack>
    </div>
  );
}

/** Chart renderer (self-contained)
 * Reads /chart-configs/:id.
 * If chart_config_json has rows embedded → use them.
 * Else, if chart_config_json.source is given → attempts to fetch rows without any backend changes by:
 *   - using source.endpoint if provided
 *   - otherwise trying a list of common REST endpoints derived from {schema?, table}
 * Supports:
 *  - type: 'radar' with mapping.categoryField + mapping.series[]
 *  - mapping.xField + mapping.yField (bar/line)
 *  - first-series fallback for bar/line
 *  - common Chart.js/ECharts/table shapes as last resort
 */
function ChartView({ chartId, width, height }) {
  const [meta, setMeta] = React.useState(null);
  const [state, setState] = React.useState({
    loading: true,
    error: null,
    type: "bar",           // bar|line|pie|radar
    single: null,          // { points:[{x,y}], xLabel, yLabel, typeHint }
    radar: null,           // { categories:[], series:[{name,color,values:[]}], max }
    debug: [],
  });

  const W = Math.max(240, width || 360);
  const H = Math.max(200, height || 260);
  const margin = 28;
  const innerW = Math.max(10, W - margin * 2);
  const innerH = Math.max(10, H - margin * 2);

  const pushDbg = (dbg, msg) => dbg.push(msg);
  const toNum = (v) => {
    if (v == null || v === "") return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const safeParse = (v) => (typeof v === "object" && v !== null ? v : (() => { try { return JSON.parse(v); } catch { return null; } })());

  // ---- helpers to accept {rows:[]}, {data:{rows:[]}}, [] etc. ----
  const takeRows = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.rows)) return data.rows;
    if (data.data && Array.isArray(data.data.rows)) return data.data.rows;
    if (Array.isArray(data.items)) return data.items;
    return null;
  };

  // ---- heuristic endpoints from {schema?, table} ----
  const tryFetchRowsFromTable = async (schema, table, limit = 500, dbg = []) => {
    const name = String(table).trim();
    const schemaDot = schema ? `${schema}.` : "";
    const candidatesGET = [
      `/data/${name}`,
      `/data/${schemaDot}${name}`,
      `/tables/${name}`,
      `/tables/${name}/rows`,
      `/table/${name}`,
      `/table/${name}/rows`,
      `/db/${name}`,
      `/db/tables/${name}`,
      `/datasets/${name}`,
      `/public/${name}`,
      `/api/${name}`,
      `/${name}`,
    ];
    const tried = [];
    for (const p of candidatesGET) {
      tried.push(`GET ${p}`);
      try {
        const { data } = await api.get(p, { params: { limit } });
        const rows = takeRows(data);
        if (Array.isArray(rows)) {
          pushDbg(dbg, `Fetched ${rows.length} rows via ${p}`);
          return { rows, tried };
        }
      } catch (_) { /* continue */ }
    }

    const candidatesPOST = [
      { url: `/sql`, body: { table: name, limit } },
      { url: `/db/query`, body: { table: name, limit } },
      { url: `/query`, body: { table: name, limit } },
    ];
    for (const x of candidatesPOST) {
      tried.push(`POST ${x.url}`);
      try {
        const { data } = await api.post(x.url, x.body);
        const rows = takeRows(data);
        if (Array.isArray(rows)) {
          pushDbg(dbg, `Fetched ${rows.length} rows via ${x.url}`);
          return { rows, tried };
        }
      } catch (_) { /* continue */ }
    }

    return { rows: null, tried };
  };

  // ---- resolve source → rows (no /table-configs dependency) ----
  const resolveRowsFromSource = async (cfg, dbg) => {
    const src = cfg?.source;
    if (!src) return { rows: null, tried: [] };

    // Embedded rows
    const embedded = cfg?.data?.rows || cfg?.rows || (Array.isArray(cfg?.data) ? cfg.data : null);
    if (Array.isArray(embedded)) {
      pushDbg(dbg, `Using embedded rows (${embedded.length}).`);
      return { rows: embedded, tried: [] };
    }

    const limit = Number(src.limit) || 500;
    const schema = src.schema || null;

    // Explicit endpoint
    if (src.endpoint) {
      const url = String(src.endpoint);
      const tried = [`GET ${url}`];
      try {
        const { data } = await api.get(url, { params: { limit, table: src.table || undefined } });
        const rows = takeRows(data);
        if (Array.isArray(rows)) {
          pushDbg(dbg, `Fetched ${rows.length} rows via source.endpoint`);
          return { rows, tried };
        }
      } catch (_) {
        pushDbg(dbg, `source.endpoint failed (GET ${url})`);
      }
      tried.push(`POST ${url}`);
      try {
        const { data } = await api.post(url, { table: src.table, limit });
        const rows = takeRows(data);
        if (Array.isArray(rows)) {
          pushDbg(dbg, `Fetched ${rows.length} rows via POST source.endpoint`);
          return { rows, tried };
        }
      } catch (_) {
        pushDbg(dbg, `source.endpoint failed (POST ${url})`);
      }
      // fall through to heuristics
    }

    // Heuristics
    if (src.table) {
      const { rows, tried } = await tryFetchRowsFromTable(schema, src.table, limit, dbg);
      if (Array.isArray(rows)) return { rows, tried };
      pushDbg(dbg, `No table endpoint responded (tried ${tried.length}).`);
      // include a readable list in debug
      if (tried.length) {
        pushDbg(dbg, "Tried:");
        tried.forEach(t => pushDbg(dbg, `  • ${t}`));
      }
      return { rows: null, tried };
    }

    pushDbg(dbg, "source.table or source.endpoint missing.");
    return { rows: null, tried: [] };
  };

  // ---- mapping + rows → series/points ----
  const fromMapping = (cfg, rows, dbg) => {
    const mapping = cfg?.mapping || {};
    const type = String(cfg?.type || "").toLowerCase();
    const catKey = mapping.categoryField || mapping.category || mapping.xField;
    const series = Array.isArray(mapping.series) ? mapping.series : [];

    if (!Array.isArray(rows) || rows.length === 0) { pushDbg(dbg, "No data rows after source resolution."); return null; }
    if (!catKey) { pushDbg(dbg, "mapping.categoryField/xField missing."); return null; }

    // categories in encountered order
    const seen = new Set();
    const categories = [];
    rows.forEach(r => {
      const v = r?.[catKey];
      const key = v == null ? null : String(v);
      if (key != null && !seen.has(key)) { seen.add(key); categories.push(v); }
    });
    if (!categories.length) { pushDbg(dbg, "No categories derived from rows."); return null; }

    if (type === "radar" && series.length > 0) {
      const serOut = series.map((s,i) => {
        const name = s.label || s.valueField || `Series ${i+1}`;
        const color = s.color || `hsl(${(i*53)%360} 70% 55%)`;
        const values = categories.map(cat => {
          const row = rows.find(r => String(r?.[catKey]) === String(cat));
          return row ? toNum(row?.[s.valueField]) : NaN;
        });
        return { name, color, values };
      });
      const max = Math.max(0, ...serOut.flatMap(s => s.values.filter(Number.isFinite)));
      if (!(max > 0)) pushDbg(dbg, "Radar values non-positive/missing; rendering may be empty.");
      return { kind: "radar", categories, series: serOut, max: max || 1 };
    }

    // xField/yField
    if (mapping.xField && mapping.yField) {
      const pts = rows.map(r => ({ x: r?.[mapping.xField], y: toNum(r?.[mapping.yField]) }))
                      .filter(p => p.x != null && Number.isFinite(p.y));
      if (pts.length) return { kind: "single", points: pts, xLabel: mapping.xField, yLabel: mapping.yField, typeHint: type || "bar" };
      pushDbg(dbg, "xField/yField present but produced 0 numeric points.");
    }

    // first series vs category
    if (series.length > 0 && series[0].valueField) {
      const s0 = series[0];
      const pts = rows.map(r => ({ x: r?.[catKey], y: toNum(r?.[s0.valueField]) }))
                      .filter(p => p.x != null && Number.isFinite(p.y));
      if (pts.length) return { kind: "single", points: pts, xLabel: catKey, yLabel: s0.label || s0.valueField, typeHint: type || "bar" };
      pushDbg(dbg, "series[0].valueField present but produced 0 numeric points.");
    }

    pushDbg(dbg, "Mapping could not produce plottable data.");
    return null;
  };

  // ---- fallback single-series normalizer (Chart.js/ECharts/common) ----
  const normalizeSingleSeries = (cfgIn, dbg) => {
    const out = { points: [], xLabel: "x", yLabel: "y", typeHint: "bar" };
    if (!cfgIn) return out;
    const cfg = typeof cfgIn === "string" ? safeParse(cfgIn) ?? cfgIn : cfgIn;
    if (typeof cfg === "string") { pushDbg(dbg, "chart_config_json is plain string"); return out; }

    // Chart.js
    if (cfg?.data && Array.isArray(cfg.data.datasets)) {
      const t = String(cfg.type || cfg.data.type || "").toLowerCase();
      const ds = cfg.data.datasets[0];
      if (Array.isArray(cfg.data.labels) && ds && Array.isArray(ds.data) && (typeof ds.data[0] === "number" || typeof ds.data[0] === "string")) {
        const labels = cfg.data.labels;
        out.points = labels.map((lab,i)=>({x:lab,y:toNum(ds.data[i])})).filter(p=>Number.isFinite(p.y));
        if (out.points.length) { out.typeHint = t || "bar"; out.xLabel="label"; out.yLabel=ds.label||"value"; return out; }
      }
      if (Array.isArray(ds?.data) && typeof ds.data[0] === "object") {
        out.points = ds.data.map(d=>({x:d.x ?? d.t ?? d.label ?? d.name, y:toNum(d.y ?? d.value)})).filter(p=>p.x!=null && Number.isFinite(p.y));
        if (out.points.length) { out.typeHint = t || "line"; return out; }
      }
      pushDbg(dbg, "Chart.js-like but not plottable.");
    }

    // ECharts bar/line
    if (cfg?.xAxis?.data && Array.isArray(cfg.series) && cfg.series[0]?.data) {
      const labels = cfg.xAxis.data;
      const s0 = cfg.series[0];
      const t = String(s0.type || cfg.type || "").toLowerCase();
      if (Array.isArray(s0.data) && (typeof s0.data[0] === "number" || typeof s0.data[0] === "string")) {
        out.points = labels.map((lab,i)=>({x:lab,y:toNum(s0.data[i])})).filter(p=>Number.isFinite(p.y));
        if (out.points.length) { out.typeHint = t || "bar"; out.xLabel="category"; out.yLabel=s0.name||"value"; return out; }
      }
      if (Array.isArray(s0.data) && Array.isArray(s0.data[0])) {
        out.points = s0.data.map(d=>({x:d[0], y:toNum(d[1])})).filter(p=>Number.isFinite(p.y));
        if (out.points.length) { out.typeHint = t || "line"; return out; }
      }
      pushDbg(dbg, "ECharts series/xAxis not plottable.");
    }

    // ECharts pie
    if (Array.isArray(cfg?.series) && String(cfg.series[0]?.type).toLowerCase().includes("pie")) {
      const d = cfg.series[0]?.data;
      if (Array.isArray(d) && typeof d[0] === "object") {
        out.points = d.map(i=>({x:i.name ?? i.label, y:toNum(i.value)})).filter(p=>p.x!=null && Number.isFinite(p.y));
        if (out.points.length) { out.typeHint="pie"; out.xLabel="segment"; out.yLabel="value"; return out; }
      }
    }

    // {columns,rows}
    if (Array.isArray(cfg?.columns) && Array.isArray(cfg?.rows)) {
      const [xK, yK] = cfg.columns;
      if (xK && yK) {
        out.points = cfg.rows.map(r=>({x:r?.[xK], y:toNum(r?.[yK])})).filter(p=>p.x!=null && Number.isFinite(p.y));
        if (out.points.length) { out.typeHint=String(cfg.type||"").toLowerCase()||"bar"; out.xLabel=xK; out.yLabel=yK; return out; }
      }
    }

    // rows: [[x,y]]
    if (Array.isArray(cfg?.rows) && Array.isArray(cfg.rows[0])) {
      out.points = cfg.rows.map(r=>({x:r[0], y:toNum(r[1])})).filter(p=>Number.isFinite(p.y));
      if (out.points.length) { out.typeHint=String(cfg.type||"").toLowerCase()||"bar"; return out; }
    }

    // {labels,values}
    if (Array.isArray(cfg?.labels) && Array.isArray(cfg?.values)) {
      out.points = cfg.labels.map((lab,i)=>({x:lab,y:toNum(cfg.values[i])})).filter(p=>Number.isFinite(p.y));
      if (out.points.length) { out.typeHint=String(cfg.type||"").toLowerCase()||"bar"; out.xLabel="label"; out.yLabel="value"; return out; }
    }

    // array of objects
    if (Array.isArray(cfg) && cfg.length && typeof cfg[0] === "object") {
      const sample = cfg[0];
      const keys = Object.keys(sample);
      const xKey = ["x","label","name","category"].find(k=>k in sample) || keys.find(k=>typeof sample[k]==="string") || keys[0];
      const yKey = ["y","value","count","amount","total"].find(k=>k in sample && Number.isFinite(toNum(sample[k])))
                || keys.find(k=>Number.isFinite(toNum(sample[k])));
      if (xKey && yKey) {
        out.points = cfg.map(r=>({x:r?.[xKey], y:toNum(r?.[yKey])})).filter(p=>p.x!=null && Number.isFinite(p.y));
        if (out.points.length) { out.typeHint="bar"; out.xLabel=xKey; out.yLabel=yKey; return out; }
      }
    }

    // array of [x,y]
    if (Array.isArray(cfg) && cfg.length && Array.isArray(cfg[0])) {
      out.points = cfg.map(r=>({x:r[0], y:toNum(r[1])})).filter(p=>Number.isFinite(p.y));
      if (out.points.length) { out.typeHint="bar"; return out; }
    }

    // explicit xKey/yKey with rows[]
    if (cfg?.xKey && cfg?.yKey && Array.isArray(cfg?.rows)) {
      out.points = cfg.rows.map(r=>({x:r?.[cfg.xKey], y:toNum(r?.[cfg.yKey])})).filter(p=>p.x!=null && Number.isFinite(p.y));
      if (out.points.length) { out.typeHint=String(cfg.type||"").toLowerCase()||"bar"; out.xLabel=cfg.xKey; out.yLabel=cfg.yKey; return out; }
    }

    pushDbg(dbg, "Unrecognized single-series shape");
    return out;
  };

  // ---- main load ----
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const dbg = [];
      try {
        const { data } = await api.get(`/chart-configs/${chartId}`);
        if (!alive) return;
        setMeta(data);

        const cfg = safeParse(data?.chart_config_json) ?? data?.chart_config_json;

        // mapping + source path
        if (cfg?.mapping && cfg?.source) {
          const { rows, tried } = await resolveRowsFromSource(cfg, dbg);
          if (Array.isArray(rows)) {
            const built = fromMapping(cfg, rows, dbg);
            if (built) {
              if (built.kind === "radar") {
                setState({ loading:false, error:null, type:"radar", radar:{ categories: built.categories, series: built.series, max: built.max }, single:null, debug:dbg });
                return;
              }
              setState({ loading:false, error:null, type: built.typeHint?.includes("line") ? "line" : "bar", single:{ points: built.points, xLabel: built.xLabel, yLabel: built.yLabel, typeHint: built.typeHint }, radar:null, debug:dbg });
              return;
            }
          } else {
            if (tried?.length) {
              pushDbg(dbg, "Tried endpoints:");
              tried.forEach(t => pushDbg(dbg, `  • ${t}`));
            }
          }
        }

        // fallback
        const single = normalizeSingleSeries(cfg, dbg);
        const any = single.points?.length > 0;
        setState({
          loading:false,
          error: any ? null : "No plottable data in chart_config_json",
          type: single.typeHint || "bar",
          single: any ? single : null,
          radar: null,
          debug: dbg,
        });
      } catch (e) {
        if (!alive) return;
        setState({ loading:false, error: e?.message || "Failed to load chart", type:"bar", single:null, radar:null, debug:[] });
      }
    })();
    return () => { alive = false; };
  }, [chartId]);

  // ---- renderers ----
  if (state.loading) return <div style={{ fontSize:12, opacity:.6 }}>Loading chart…</div>;
  if (state.error && !state.single && !state.radar) {
    return <DebugPanel state={state} meta={meta} />;
  }

  // Radar
  if (state.type === "radar" && state.radar) {
    const { categories, series, max } = state.radar;
    const cx = W/2, cy = H/2;
    const R = Math.min(innerW, innerH)/2;
    const N = categories.length || 1;
    const angle = (i) => (Math.PI * 2 * i / N) - Math.PI/2;

    const axisPts = categories.map((_,i)=>({ x: cx + R*Math.cos(angle(i)), y: cy + R*Math.sin(angle(i)) }));
    const gridLevels = 4;
    const levelPolys = Array.from({length:gridLevels}, (_,lv) => {
      const r = R * ((lv+1)/gridLevels);
      return categories.map((_,i)=>({ x: cx + r*Math.cos(angle(i)), y: cy + r*Math.sin(angle(i)) }));
    });
    const polyForSeries = (s) => s.values.map((v,i)=>{
      const ratio = Math.max(0, Number.isFinite(v) && max>0 ? v/max : 0);
      const r = R * ratio;
      return `${cx + r*Math.cos(angle(i))},${cy + r*Math.sin(angle(i))}`;
    }).join(" ");

    return (
      <div style={{ width:'100%', height:'100%', overflow:'hidden' }}>
        <svg width={W} height={H} role="img" aria-label={`Radar ${chartId}`} style={{ display:'block' }}>
          {levelPolys.map((pts,i)=><polygon key={i} points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#cfd8dc" strokeWidth="1"/>)}
          {axisPts.map((p,i)=><line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#cfd8dc" strokeWidth="1"/>)}
          {series.map((s,i)=>(
            <polygon key={i} points={polyForSeries(s)} fill={s.color || `hsl(${(i*53)%360} 70% 55%)`} opacity="0.25" stroke={s.color || '#607d8b'} strokeWidth="2"/>
          ))}
          {series.map((s,i)=>(
            <g key={`lg${i}`}>
              <rect x={margin} y={margin + i*16 - 10} width="10" height="10" fill={s.color || `hsl(${(i*53)%360} 70% 55%)`} />
              <text x={margin + 14} y={margin + i*16 - 2} fontSize="10" fill="#546e7a">{s.name}</text>
            </g>
          ))}
          {categories.map((c,i)=>{
            const a = angle(i); const r = R + 12;
            const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a);
            const ta = Math.cos(a) > 0.2 ? 'start' : (Math.cos(a) < -0.2 ? 'end' : 'middle');
            return <text key={i} x={x} y={y} fontSize="10" textAnchor={ta} dominantBaseline="middle" fill="#546e7a">{String(c)}</text>;
          })}
        </svg>
        <div style={{ fontSize:10, opacity:.7, padding:'2px 6px' }}>
          {meta?.chart_name || 'Radar'}
        </div>
        {state.debug?.length ? <DebugPanel state={state} meta={meta} compact /> : null}
      </div>
    );
  }

  // Single (bar/line/pie)
  if (state.single) {
    const { points, typeHint, xLabel, yLabel } = state.single;
    const isPie = typeHint.includes("pie");
    const isLine = typeHint.includes("line");

    if (isPie) {
      const total = points.reduce((s,p)=>s+(Number.isFinite(p.y)?p.y:0),0);
      if (!(total>0)) return <div style={{ fontSize:12, opacity:.6 }}>No positive values for pie.</div>;
      const cx = W/2, cy = H/2, r = Math.min(innerW, innerH)/2;
      let acc = 0;
      return (
        <div style={{ width:"100%", height:"100%" }}>
          <svg width={W} height={H} style={{ display:'block' }}>
            {points.map((p,i)=>{
              const start = acc; const ang = (p.y/total)*Math.PI*2; acc += ang; const end = start + ang;
              const large = ang > Math.PI ? 1 : 0;
              const x1 = cx + r*Math.cos(start), y1 = cy + r*Math.sin(start);
              const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
              return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={`hsl(${(i*47)%360} 70% 55%)`} stroke="#fff" strokeWidth="1"/>;
            })}
          </svg>
          <div style={{ fontSize:10, opacity:.7, padding:"2px 6px" }}>
            {meta?.chart_name || "Pie"} · total {total}
          </div>
          {state.debug?.length ? <DebugPanel state={state} meta={meta} compact /> : null}
        </div>
      );
    }

    if (!points.length) return <DebugPanel state={state} meta={meta} />;

    const ymax = Math.max(...points.map(p=>Number.isFinite(p.y)?p.y:0), 0);
    const ymin = 0;
    const stepX = innerW / Math.max(1, points.length);
    const barW = Math.max(4, stepX * 0.6);
    const yScale = v => (ymax===ymin ? margin+innerH : margin+innerH - ((v - ymin)/(ymax-ymin))*innerH);

    return (
      <div style={{ width:"100%", height:"100%" }}>
        <svg width={W} height={H} style={{ display:'block' }}>
          <line x1={margin} y1={margin+innerH} x2={margin+innerW} y2={margin+innerH} stroke="#90a4ae"/>
          <line x1={margin} y1={margin}         x2={margin}        y2={margin+innerH} stroke="#90a4ae"/>
          {!isLine && points.map((p,i)=>{
            const cx = margin + i*stepX + stepX/2;
            const y  = yScale(p.y);
            const h  = Math.max(0, margin+innerH - y);
            return <rect key={i} x={cx-barW/2} y={y} width={barW} height={h} fill="#64b5f6" opacity="0.9"/>;
          })}
          {isLine && (
            <>
              <polyline
                fill="none"
                stroke="#42a5f5"
                strokeWidth="2"
                points={points.map((p,i)=>`${margin + i*stepX + stepX/2},${yScale(p.y)}`).join(' ')}
              />
              {points.map((p,i)=><circle key={i} cx={margin + i*stepX + stepX/2} cy={yScale(p.y)} r="2.8" fill="#1e88e5"/>)}
            </>
          )}
          <text x={margin-6} y={yScale(ymax)} fontSize="10" textAnchor="end" fill="#607d8b">{ymax}</text>
        </svg>
        <div style={{ fontSize:10, opacity:.7, padding:"2px 6px" }}>
          {xLabel} vs {yLabel} {meta?.chart_name ? `· ${meta.chart_name}` : ""}
        </div>
        {state.debug?.length ? <DebugPanel state={state} meta={meta} compact /> : null}
      </div>
    );
  }

  return <DebugPanel state={state} meta={meta} />;
}

function DebugPanel({ state, meta, compact = false }) {
  return (
    <div style={{
      fontSize: 11,
      color: "#455a64",
      background: "#f5f7f9",
      border: "1px dashed #cfd8dc",
      borderRadius: 6,
      marginTop: 6,
      padding: "6px 8px",
      maxHeight: compact ? 100 : 180,
      overflow: "auto"
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Chart data inspector</div>
      {state.single?.points?.length
        ? <div>Plotted {state.single.points.length} points.</div>
        : state.radar
        ? <div>Radar with {state.radar.categories?.length || 0} categories.</div>
        : <div style={{ color:"#c62828" }}>No plottable data detected.</div>}
      <div style={{ opacity:.8, marginTop: 4 }}>
        {meta?.chart_name ? <span>Chart: <code>{meta.chart_name}</code> · </span> : null}
        Type: <code>{state.type}</code>
      </div>
      {state.error && <div style={{ marginTop: 4, color:"#c62828" }}>{String(state.error)}</div>}
      {state.debug?.length ? (
        <ul style={{ margin: "6px 0 0 16px" }}>
          {state.debug.map((d,i) => <li key={i}>{d}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

/* ==========================
   Shell (list + modal)
   ========================== */
export default function UICreator() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("edit");
  const [initial, setInitial] = useState(null);

  const loadList = async () => {
    const { data } = await api.get("/canvas-configs", { params: { page, pageSize, q } });
    setList(data.items || []);
    setTotal(data.total || 0);
  };
  useEffect(() => { loadList(); /* eslint-disable-next-line */ }, [page, pageSize, q]);

  const openNew = () => { setInitial(null); setMode("edit"); setModalOpen(true); };
  const openView = async (id) => { const { data } = await api.get(`/canvas-configs/${id}`); setInitial(data); setMode("view"); setModalOpen(true); };
  const openEdit = async (id) => { const { data } = await api.get(`/canvas-configs/${id}`); setInitial(data); setMode("edit"); setModalOpen(true); };
  const handleArchive = async (id) => { if (!window.confirm("Archive this canvas?")) return; await api.patch(`/canvas-configs/${id}/archive`, { updated_by: 1 }); loadList(); };

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" gap={2} alignItems="center">
          <TextField size="small" label="Search" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          <Button size="small" onClick={() => { setQ(""); setPage(1); }}>Clear</Button>
        </Stack>
        <Button variant="contained" onClick={openNew}>Create New Canvas</Button>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "40%" }}>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right" sx={{ width: 200 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.canvas_name}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View"><IconButton onClick={() => openView(r.id)}><VisibilityIcon /></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton onClick={() => openEdit(r.id)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete (Archive)"><IconButton onClick={() => handleArchive(r.id)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center">No canvases yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <Pagination count={Math.max(1, Math.ceil(total / pageSize))} page={page} onChange={(_, p) => setPage(p)} />
      </Stack>

      <CreateCanvasModal
        open={modalOpen}
        mode={mode}
        initial={initial}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); loadList(); }}
      />
    </Box>
  );
}

/* ==========================
   Modal Editor
   ========================== */
function CreateCanvasModal({ open, mode = "edit", onClose, onSaved, initial }) {
  const COLS = 108, ROWS = 54, CELL = 12;

  const [blocks, setBlocks] = useState([]);
  const [occupied, setOccupied] = useState(new Set());
  const [canvasBg, setCanvasBg] = useState("#f2f4f7");

  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const idRef = useRef(1);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuBlockId, setMenuBlockId] = useState(null);
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);

  const [cfgType, setCfgType] = useState("");
  const [cfgTableId, setCfgTableId] = useState("");
  const [cfgFormId, setCfgFormId] = useState("");
  const [cfgChartId, setCfgChartId] = useState("");
  const [cfgText, setCfgText] = useState("");
  const [cfgTextColor, setCfgTextColor] = useState("#222222");
  const [cfgTextSize, setCfgTextSize] = useState(14);
  const [tables, setTables] = useState([]);
  const [forms, setForms] = useState([]);
  const [charts, setCharts] = useState([]);

  const [canvasId, setCanvasId] = useState(null);
  const [canvasName, setCanvasName] = useState("");
  const [canvasDesc, setCanvasDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const cfg = initial.canvas_config || {};
      setCanvasId(initial.id);
      setCanvasName(initial.canvas_name || "");
      setCanvasDesc(initial.description || "");
      setCanvasBg(cfg.grid?.background || "#f2f4f7");
      setBlocks(cfg.blocks || []);
      const occ = new Set();
      (cfg.blocks || []).forEach((b) => {
        for (let r = b.r1; r <= b.r2; r++) for (let c = b.c1; c <= b.c2; c++) occ.add(r * COLS + c);
      });
      setOccupied(occ);
      idRef.current = Math.max(1, ...((cfg.blocks || []).map((b) => b.id + 1)));
    } else {
      setCanvasId(null);
      setCanvasName("");
      setCanvasDesc("");
      setCanvasBg("#f2f4f7");
      setBlocks([]);
      setOccupied(new Set());
      idRef.current = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  // lookups for dialog (unchanged)
  useEffect(() => {
    let active = true;
    if (!cfgOpen) return;
    (async () => {
      try {
        const [t, f, c] = await Promise.all([
          api.get("/table-configs"),
          api.get("/form-configs/masters"),
          api.get("/chart-configs"),
        ]);
        if (active) {
          setTables(t.data || []);
          setForms(f.data || []);
          setCharts(c.data || []);
        }
      } catch (e) {
        console.error("Lookup fetch failed", e);
      }
    })();
    return () => { active = false; };
  }, [cfgOpen]);

  const rcFromIndex = (i) => [Math.floor(i / COLS), i % COLS];
  const indexFromRC = (r, c) => r * COLS + c;

  const rect = useMemo(() => {
    if (selStart == null || selEnd == null) return null;
    const [r1, c1] = rcFromIndex(selStart);
    const [r2, c2] = rcFromIndex(selEnd);
    return { r1: Math.min(r1, r2), c1: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
  }, [selStart, selEnd]);

  const indicesInRect = (r) => {
    const out = [];
    for (let rr = r.r1; rr <= r.r2; rr++) for (let cc = r.c1; cc <= r.c2; cc++) out.push(indexFromRC(rr, cc));
    return out;
  };

  const canMerge = (r) => {
    if (!r) return false;
    for (const idx of indicesInRect(r)) if (occupied.has(idx)) return false;
    return true;
  };

  const handleMerge = () => {
    if (!rect || !canMerge(rect) || mode === "view") return;
    const id = idRef.current++;
    const newBlock = { id, ...rect, props: { corner: "rounded" }, component: { type: null } };
    setBlocks((prev) => [...prev, newBlock]);
    const occ = new Set(occupied);
    indicesInRect(rect).forEach((i) => occ.add(i));
    setOccupied(occ);
    setSelecting(false);
    setSelStart(null);
    setSelEnd(null);
  };

  const cellsForRect = (r) => {
    const out = [];
    for (let rr = r.r1; rr <= r.r2; rr++) for (let cc = r.c1; cc <= r.c2; cc++) out.push(indexFromRC(rr, cc));
    return out;
  };
  const canPlaceRect = (r, ignoreId = null) => {
    if (!r) return false;
    if (r.r1 < 0 || r.c1 < 0 || r.r2 >= ROWS || r.c2 >= COLS) return false;
    const occ = new Set(occupied);
    if (ignoreId != null) {
      const blk = blocks.find((b) => b.id === ignoreId);
      if (blk) cellsForRect(blk).forEach((i) => occ.delete(i));
    }
    for (const idx of cellsForRect(r)) if (occ.has(idx)) return false;
    return true;
  };

  const unmerge = (id) => {
    if (mode === "view") return;
    const blk = blocks.find((b) => b.id === id);
    if (!blk) return;
    const occ = new Set(occupied);
    indicesInRect(blk).forEach((i) => occ.delete(i));
    setOccupied(occ);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const [drag, setDrag] = useState(null);
  const startMove = (e, b) => {
    if (mode === "view") return;
    e.stopPropagation();
    setDrag({ mode: "move", id: b.id, startX: e.clientX, startY: e.clientY, orig: { r1: b.r1, c1: b.c1, r2: b.r2, c2: b.c2 }, preview: null });
  };
  const startResize = (e, b) => {
    if (mode === "view") return;
    e.stopPropagation();
    setDrag({ mode: "resize", id: b.id, startX: e.clientX, startY: e.clientY, orig: { r1: b.r1, c1: b.c1, r2: b.r2, c2: b.c2 }, preview: null });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      const dc = Math.round(dx / CELL), dr = Math.round(dy / CELL);
      let r;
      if (drag.mode === "move") r = { r1: drag.orig.r1 + dr, c1: drag.orig.c1 + dc, r2: drag.orig.r2 + dr, c2: drag.orig.c2 + dc };
      else r = { ...drag.orig, r2: Math.max(drag.orig.r1, drag.orig.r2 + dr), c2: Math.max(drag.orig.c1, drag.orig.c2 + dc) };
      r.r1 = Math.max(0, Math.min(ROWS - 1, r.r1));
      r.c1 = Math.max(0, Math.min(COLS - 1, r.c1));
      r.r2 = Math.max(0, Math.min(ROWS - 1, r.r2));
      r.c2 = Math.max(0, Math.min(COLS - 1, r.c2));
      setDrag((d) => ({ ...d, preview: r }));
    };
    const onUp = () => {
      if (drag.preview && canPlaceRect(drag.preview, drag.id)) {
        setBlocks((prev) => prev.map((b) => (b.id === drag.id ? { ...b, ...drag.preview } : b)));
        const blk = blocks.find((b) => b.id === drag.id);
        const occ = new Set(occupied);
        if (blk) cellsForRect(blk).forEach((i) => occ.delete(i));
        cellsForRect(drag.preview).forEach((i) => occ.add(i));
        setOccupied(occ);
      }
      setDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, blocks, occupied]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSel = (i) => { if (mode === "view") return; setSelecting(true); setSelStart(i); setSelEnd(i); };
  const moveSel = (i) => { if (!selecting) return; setSelEnd(i); };
  const endSel = () => setSelecting(false);

  const clearAll = () => {
    if (mode === "view") return;
    setBlocks([]); setOccupied(new Set()); setSelecting(false); setSelStart(null); setSelEnd(null); idRef.current = 1;
  };

  const layoutData = useMemo(() => ({ grid: { cols: COLS, rows: ROWS, cellPx: CELL, background: canvasBg }, blocks }), [blocks, canvasBg]);
  const getUserId = () => Number(localStorage.getItem("userId")) || 1;

  const doSave = async () => {
    if (mode === "view") return onClose();
    try {
      setSaving(true);
      const payload = {
        canvas_name: canvasName || "Untitled Canvas",
        description: canvasDesc || null,
        canvas_config: layoutData,
        org_id: Number(localStorage.getItem("orgId")) || null,
      };
      let res;
      if (canvasId) res = await api.put(`/canvas-configs/${canvasId}`, { ...payload, updated_by: getUserId() });
      else res = await api.post(`/canvas-configs`, { ...payload, created_by: getUserId() });
      const row = res.data;
      setCanvasId(row.id);
      onSaved && onSaved(row);
    } catch (err) {
      console.error("Save failed", err);
      alert(err?.response?.data?.message || "Failed to save canvas");
    } finally {
      setSaving(false);
    }
  };

  const openBlockMenu = (evt, id) => { setMenuAnchor(evt.currentTarget); setMenuBlockId(id); };
  const closeBlockMenu = () => setMenuAnchor(null);
  const setCorner = (style) => { setBlocks((prev) => prev.map((b) => (b.id === menuBlockId ? { ...b, props: { ...b.props, corner: style } } : b))); closeBlockMenu(); };

  const openConfigure = () => {
    const blk = blocks.find((b) => b.id === menuBlockId);
    const comp = blk?.component || { type: null };
    setCfgType(comp.type || "");
    setCfgTableId(comp.table_id || "");
    setCfgFormId(comp.form_id || "");
    setCfgChartId(comp.chart_id || "");
    setCfgText(comp.html || "");
    setCfgTextColor(comp.color || "#222222");
    setCfgTextSize(comp.fontSize || 14);
    setCfgOpen(true);
    closeBlockMenu();
  };

  const applyConfigure = () => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === menuBlockId
          ? {
              ...b,
              component:
                cfgType === "table"
                  ? { type: "table", table_id: Number(cfgTableId) || null }
                  : cfgType === "form"
                  ? { type: "form", form_id: Number(cfgFormId) || null }
                  : cfgType === "chart"
                  ? { type: "chart", chart_id: Number(cfgChartId) || null }
                  : cfgType === "text"
                  ? { type: "text", html: cfgText, color: cfgTextColor, fontSize: Number(cfgTextSize) || 14 }
                  : { type: null },
            }
          : b
      )
    );
    setCfgOpen(false);
  };

  const renderBlock = (b, widthPx, heightPx) => {
    const comp = b.component || {};
    if (comp.type === "table" && comp.table_id) return <TableView tableId={comp.table_id} width={widthPx} height={heightPx} />;
    if (comp.type === "form" && comp.form_id) return <FormView formId={comp.form_id} width={widthPx} height={heightPx} />;
    if (comp.type === "chart" && comp.chart_id) return <ChartView chartId={comp.chart_id} width={widthPx} height={heightPx} />;
    if (comp.type === "text") return <div style={{ color: comp.color, fontSize: comp.fontSize, height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: comp.html }} />;
    return <div style={{ fontSize: 12, opacity: 0.6 }}>Configure…</div>;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {mode === "view" ? "View Canvas" : "New Canvas"} ({COLS} × {ROWS})
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField label="Canvas name" size="small" value={canvasName} onChange={(e) => setCanvasName(e.target.value)} disabled={mode === "view"} />
          <TextField label="Description" size="small" value={canvasDesc} onChange={(e) => setCanvasDesc(e.target.value)} disabled={mode === "view"} sx={{ flex: 1 }} />
        </Stack>
        {mode !== "view" && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Button variant="contained" onClick={handleMerge} disabled={!rect || !canMerge(rect)}>Merge selection</Button>
            <Button variant="outlined" onClick={clearAll}>Clear</Button>
          </Stack>
        )}

        <div
          style={{ position: "relative", width: "100%", maxWidth: "100%", overflow: "auto", border: "1px solid #c5ced6", borderRadius: 8, background: "#fff" }}
          onMouseLeave={endSel}
        >
          <div style={{ position: "relative", width: COLS * CELL + 2, height: ROWS * CELL + 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gridTemplateRows: `repeat(${ROWS}, ${CELL}px)` }}>
              {Array.from({ length: COLS * ROWS }, (_, i) => (
                <div
                  key={i}
                  onMouseDown={() => startSel(i)}
                  onMouseEnter={() => moveSel(i)}
                  onMouseUp={endSel}
                  style={{ width: CELL, height: CELL, border: "1px solid #9fb2c2", background: canvasBg }}
                />
              ))}
            </div>

            {rect && mode !== "view" && (
              <div
                style={{
                  position: "absolute",
                  left: rect.c1 * CELL,
                  top: rect.r1 * CELL,
                  width: (rect.c2 - rect.c1 + 1) * CELL,
                  height: (rect.r2 - rect.r1 + 1) * CELL,
                  background: "rgba(25,118,210,0.12)",
                  outline: `2px solid ${canMerge(rect) ? "#1976d2" : "#e53935"}`,
                  pointerEvents: "none",
                  borderRadius: 6,
                }}
              />
            )}

            {blocks.map((b) => {
              const widthPx = (b.c2 - b.c1 + 1) * CELL;
              const heightPx = (b.r2 - b.r1 + 1) * CELL;

              return (
                <div
                  key={b.id}
                  style={{
                    position: "absolute",
                    left: b.c1 * CELL,
                    top: b.r1 * CELL,
                    width: widthPx,
                    height: heightPx,
                    border: "2px solid #000",
                    borderRadius: b.props?.corner === "square" ? 4 : 10,
                    background: "#fff",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                  }}
                >
                  {mode !== "view" && (
                    <>
                      <div
                        onMouseDown={(e) => startMove(e, b)}
                        title="Drag"
                        style={{ position: "absolute", left: 6, top: 6, width: 14, height: 14, borderRadius: 4, background: "#e9eef3", border: "1px solid #b7c5d1", cursor: "move" }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => openBlockMenu(e, b.id)}
                        sx={{ position: "absolute", left: 4, bottom: 4, bgcolor: "#fff", boxShadow: 1, zIndex: 2, p: "2px" }}
                      >
                        <MoreHorizIcon fontSize="inherit" />
                      </IconButton>
                    </>
                  )}

                  <div style={{ width: "100%", height: "100%", boxSizing: "border-box", padding: "12px 20px 12px 12px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                    {renderBlock(b, widthPx - 16, heightPx - 16)}
                  </div>

                  {mode !== "view" && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => unmerge(b.id)}
                        sx={{ position: "absolute", right: -12, top: -12, bgcolor: "#000", color: "#fff", "&:hover": { bgcolor: "#333" } }}
                        title="Unmerge"
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>

                      <div
                        onMouseDown={(e) => startResize(e, b)}
                        title="Resize"
                        style={{ position: "absolute", right: 2, bottom: 2, width: 12, height: 12, cursor: "nwse-resize", borderRight: "2px solid #9fb2c2", borderBottom: "2px solid #9fb2c2" }}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {drag?.preview && (
              <div
                style={{
                  position: "absolute",
                  left: drag.preview.c1 * CELL,
                  top: drag.preview.r1 * CELL,
                  width: (drag.preview.c2 - drag.preview.c1 + 1) * CELL,
                  height: (drag.preview.r2 - drag.preview.r1 + 1) * CELL,
                  outline: `2px dashed ${canPlaceRect(drag.preview, drag.id) ? "#1976d2" : "#e53935"}`,
                  pointerEvents: "none",
                  borderRadius: 8,
                }}
              />
            )}
          </div>
        </div>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeBlockMenu}>
          <MenuItem onClick={() => { setBgDialogOpen(true); closeBlockMenu(); }}>Canvas background…</MenuItem>
          <Divider />
          <MenuItem onClick={() => setCorner("rounded")}>Corner: Rounded</MenuItem>
          <MenuItem onClick={() => setCorner("square")}>Corner: Square</MenuItem>
          <Divider />
          <MenuItem onClick={openConfigure}>Configure content…</MenuItem>
          <Divider />
          <MenuItem onClick={() => { unmerge(menuBlockId); closeBlockMenu(); }}>Remove block</MenuItem>
        </Menu>

        <Dialog open={bgDialogOpen} onClose={() => setBgDialogOpen(false)}>
          <DialogTitle>Canvas background</DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <input type="color" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} />
              <TextField size="small" label="Hex" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setBgDialogOpen(false)}>Close</Button></DialogActions>
        </Dialog>

        <Dialog open={cfgOpen} onClose={() => setCfgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Configure content</DialogTitle>
          <DialogContent dividers>
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={cfgType} onChange={(e) => setCfgType(e.target.value)}>
                <MenuItem value={"table"}>Table</MenuItem>
                <MenuItem value={"form"}>Form</MenuItem>
                <MenuItem value={"chart"}>Chart</MenuItem>
                <MenuItem value={"text"}>Text</MenuItem>
              </Select>
            </FormControl>

            {cfgType === "table" && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Table (from table_config)</InputLabel>
                <Select label="Table (from table_config)" value={cfgTableId} onChange={(e) => setCfgTableId(e.target.value)}>
                  {tables.map((t) => <MenuItem key={t.id} value={t.id}>{t.table_name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {cfgType === "form" && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Form (from form_configs)</InputLabel>
                <Select label="Form (from form_configs)" value={cfgFormId} onChange={(e) => setCfgFormId(e.target.value)}>
                  {forms.map((f) => <MenuItem key={f.id} value={f.id}>{f.template_name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {cfgType === "chart" && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Chart (from chart_configs)</InputLabel>
                <Select label="Chart (from chart_configs)" value={cfgChartId} onChange={(e) => setCfgChartId(e.target.value)}>
                  {charts.length === 0 && <MenuItem disabled value="">No charts found</MenuItem>}
                  {charts.map((c) => <MenuItem key={c.id} value={c.id}>{c.chart_name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {cfgType === "text" && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField label="Text" multiline minRows={3} value={cfgText} onChange={(e) => setCfgText(e.target.value)} />
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField type="color" label="Color" value={cfgTextColor} onChange={(e) => setCfgTextColor(e.target.value)} sx={{ width: 120 }} />
                  <TextField type="number" label="Font size" value={cfgTextSize} onChange={(e) => setCfgTextSize(e.target.value)} sx={{ width: 160 }} />
                </Stack>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCfgOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={applyConfigure}>Apply</Button>
          </DialogActions>
        </Dialog>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{mode === "view" ? "Close" : "Cancel"}</Button>
        {mode !== "view" && <Button variant="contained" onClick={doSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>}
      </DialogActions>
    </Dialog>
  );
}





// //COMMENTED TO ADD UPDATED CODE
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import api from "../services/api";
// import {
//   Box,
//   Button,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   IconButton,
//   Stack,
//   Menu,
//   MenuItem,
//   Divider,
//   FormControl,
//   InputLabel,
//   Select,
//   TextField,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Pagination,
//   Tooltip,
// } from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
// import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import EditIcon from "@mui/icons-material/Edit";
// import DeleteIcon from "@mui/icons-material/Delete";


// /**
//  * UICreator – with Saved Canvases list + Canvas Modal
//  * - Shows saved canvases list
//  * - Create / View / Edit + archive
//  * - 108×54 grid with drag/resize & block config
//  * - Components: table, form, text, chart
//  */

// /* ==========================
//    Helpers for charts
//    ========================== */
// const coerceArray = (d) => {
//   if (Array.isArray(d)) return d;
//   if (d?.items && Array.isArray(d.items)) return d.items;
//   if (d?.data && Array.isArray(d.data)) return d.data;
//   if (d?.rows && Array.isArray(d.rows)) return d.rows;
//   if (d?.result && Array.isArray(d.result)) return d.result;
//   return [];
// };

// const tryGet = async (path) => {
//   try {
//     const { data } = await api.get(path);
//     return { ok: true, data };
//   } catch (e) {
//     return { ok: false, error: e };
//   }
// };

// const buildChartDataEndpoints = (id, meta) => {
//   // prefer explicit endpoint in meta if present
//   const explicit =
//     meta?.data_endpoint ||
//     meta?.endpoint ||
//     meta?.dataUrl ||
//     meta?.data_url ||
//     meta?.config?.data_endpoint ||
//     meta?.config?.endpoint ||
//     meta?.config?.dataApi ||
//     meta?.config?.data_url;

//   const c = [];
//   if (explicit && typeof explicit === "string") {
//     c.push(explicit.startsWith("/") ? explicit : `/${explicit}`);
//   }
//   // common fallbacks
//   c.push(
//     `/chart-configs/${id}/data`,
//     `/chart-configs/${id}/preview`,
//     `/chart-configs/${id}/dataset`,
//     `/charts/${id}/data`,
//     `/chart-configs/data/${id}`,
//     `/chart-data/${id}`
//   );

//   // de-dupe
//   return [...new Set(c)];
// };

// const normalizeChartData = (payload) => {
//   if (!payload) return { points: [], xKey: "x", yKey: "y" };

//   // { columns: ['x','y'], rows: [{x:..., y:...}] }
//   if (Array.isArray(payload.columns) && Array.isArray(payload.rows) && payload.rows.length && !Array.isArray(payload.rows[0])) {
//     const [xKey, yKey] = payload.columns;
//     const points = payload.rows
//       .map((r) => ({ x: r[xKey], y: Number(r[yKey]) }))
//       .filter((p) => Number.isFinite(p.y));
//     return { points, xKey: xKey || "x", yKey: yKey || "y" };
//   }

//   // rows: [[x,y], ...] (header row first)
//   if (Array.isArray(payload.rows) && payload.rows.length && Array.isArray(payload.rows[0])) {
//     const headers = payload.rows[0];
//     const xKey = headers?.[0] ?? "x";
//     const yKey = headers?.[1] ?? "y";
//     const points = payload.rows.slice(1).map((r) => ({ x: r[0], y: Number(r[1]) })).filter((p) => Number.isFinite(p.y));
//     return { points, xKey, yKey };
//   }

//   // { columns: ['x','y'], data: [[x,y], ...] }
//   if (Array.isArray(payload.columns) && Array.isArray(payload.data) && Array.isArray(payload.data[0])) {
//     const [xKey, yKey] = payload.columns;
//     const points = payload.data.map((r) => ({ x: r[0], y: Number(r[1]) })).filter((p) => Number.isFinite(p.y));
//     return { points, xKey: xKey || "x", yKey: yKey || "y" };
//   }

//   // categories + series[0].data
//   if (Array.isArray(payload.categories) && Array.isArray(payload.series) && payload.series[0]?.data) {
//     const xKey = "category";
//     const yKey = payload.series[0].name || "value";
//     const points = payload.categories
//       .map((c, i) => ({ x: c, y: Number(payload.series[0].data[i]) }))
//       .filter((p) => Number.isFinite(p.y));
//     return { points, xKey, yKey };
//   }

//   // simple array of objects
//   if (Array.isArray(payload) && payload.length && typeof payload[0] === "object") {
//     const keys = Object.keys(payload[0]);
//     const xKey = keys[0] || "x";
//     const yKey = keys[1] || "y";
//     const points = payload
//       .map((r) => ({ x: r[xKey], y: Number(r[yKey]) }))
//       .filter((p) => Number.isFinite(p.y));
//     return { points, xKey, yKey };
//   }

//   return { points: [], xKey: "x", yKey: "y" };
// };

// /* ==========================
//    Renderers
//    ========================== */
// function TableView({ tableId, width, height }) {
//   const [meta, setMeta] = React.useState(null);
//   const [rows, setRows] = React.useState([]);
//   const [columns, setColumns] = React.useState([]);
//   const [total, setTotal] = React.useState(0);
//   const [page, setPage] = React.useState(1);
//   const [search, setSearch] = React.useState("");
//   const [pageSize, setPageSize] = React.useState(10);

//   React.useEffect(() => {
//     const header = 36;
//     const controls = 32;
//     const rowH = 28;
//     const h = Math.max(0, (height || 0) - header - controls - 12);
//     const fit = Math.max(3, Math.floor(h / rowH));
//     if (fit !== pageSize) setPageSize(fit);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [height]);

//   const debouncedSearchRef = React.useRef(null);
//   const setSearchDebounced = (val) => {
//     setSearch(val);
//     if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
//     debouncedSearchRef.current = setTimeout(() => {
//       fetchData(1, pageSize, val);
//     }, 350);
//   };

//   const fetchMeta = async () => {
//     const m = await api.get(`/table-configs/${tableId}`);
//     setMeta(m.data);
//   };
//   const fetchData = async (p = page, ps = pageSize, s = search) => {
//     const d = await api.get(`/table-configs/${tableId}/data`, { params: { page: p, pageSize: ps, search: s } });
//     setColumns(d.data.columns || Object.keys(meta?.config || {}));
//     setRows(d.data.rows || []);
//     setTotal(d.data.total || 0);
//     setPage(d.data.page || p);
//   };

//   React.useEffect(() => {
//     let on = true;
//     (async () => {
//       await fetchMeta();
//       if (on) await fetchData(1, pageSize, "");
//     })();
//     return () => {
//       on = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [tableId]);

//   React.useEffect(() => {
//     fetchData(page, pageSize, search);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [pageSize]);

//   if (!meta) return <div style={{ fontSize: 12, opacity: 0.6 }}>Loading…</div>;

//   return (
//     <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
//       {height > 100 && (
//         <div style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 4 }}>
//           <TextField size="small" placeholder="Search…" value={search} onChange={(e) => setSearchDebounced(e.target.value)} sx={{ flex: 1 }} />
//           <FormControl size="small" sx={{ width: 100 }}>
//             <InputLabel>Rows</InputLabel>
//             <Select label="Rows" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
//               {[3, 5, 10, 15, 20, 30].map((n) => (
//                 <MenuItem key={n} value={n}>
//                   {n}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         </div>
//       )}

//       <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid #e0e6eb", borderRadius: 6 }}>
//         <Table size="small" stickyHeader aria-label="grid-table" sx={{ tableLayout: "fixed", width: "100%" }}>
//           <TableHead>
//             <TableRow>
//               {(columns.length ? columns : Object.keys(meta.config || {})).map((c) => (
//                 <TableCell key={c} sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
//                   {c}
//                 </TableCell>
//               ))}
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {rows.length === 0 ? (
//               <TableRow>
//                 <TableCell colSpan={Math.max(1, columns.length || 1)} sx={{ fontSize: 12, opacity: 0.6 }}>
//                   No rows
//                 </TableCell>
//               </TableRow>
//             ) : (
//               rows.map((r, i) => (
//                 <TableRow key={i}>
//                   {(columns.length ? columns : Object.keys(meta.config || {})).map((c) => (
//                     <TableCell key={c} sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
//                       {String(r[c] ?? "")}
//                     </TableCell>
//                   ))}
//                 </TableRow>
//               ))
//             )}
//           </TableBody>
//         </Table>
//       </div>

//       {height > 80 && (
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, fontSize: 12 }}>
//           <div>
//             Rows: {rows.length} / {total}
//           </div>
//           <Stack direction="row" spacing={1}>
//             <Button size="small" onClick={() => fetchData(Math.max(1, page - 1), pageSize, search)} disabled={page <= 1}>
//               Prev
//             </Button>
//             <div style={{ padding: "6px 8px" }}>{page}</div>
//             <Button size="small" onClick={() => fetchData(page + 1, pageSize, search)} disabled={page * pageSize >= total}>
//               Next
//             </Button>
//           </Stack>
//         </div>
//       )}
//     </div>
//   );
// }

// function FormView({ formId, readOnly = true, width, height }) {
//   const [cfg, setCfg] = React.useState(null);
//   const [error, setError] = React.useState(null);
//   const [data, setData] = React.useState(null);
//   React.useEffect(() => {
//     let active = true;
//     (async () => {
//       try {
//         const [{ data: conf }, { data: row }] = await Promise.all([api.get(`/form-configs/${formId}`), api.get(`/form-configs/${formId}/data`)]);
//         if (!active) return;
//         setCfg(conf);
//         setData(row.row || null);
//       } catch (e) {
//         if (active) setError(e);
//       }
//     })();
//     return () => {
//       active = false;
//     };
//   }, [formId]);

//   if (error) return <div style={{ fontSize: 12, color: "#c62828" }}>Failed to load form #{formId}</div>;
//   if (!cfg) return <div style={{ fontSize: 12, opacity: 0.6 }}>Loading form…</div>;

//   const fields = Array.isArray(cfg.fields_json) ? cfg.fields_json.filter((f) => f?.visible) : [];

//   return (
//     <div style={{ height: "100%", width: "100%", overflow: "auto" }}>
//       <Stack spacing={1} sx={{ p:1, minWidth: 200 }}>
//         {fields.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>No visible fields</div>}
//         {fields.map((f, idx) => {
//           const type = (f.dataType || "text").toLowerCase();
//           const label = f.columnName || f.name || `Field ${idx + 1}`;
//           const value = data ? data[label] ?? data[f.columnName] ?? "" : "";
//           const common = { label, size: "small", fullWidth: true, disabled: !!(readOnly || f.readOnly), value };
//           if (type === "integer" || type === "number") return <TextField key={idx} type="number" {...common} />;
//           if (type === "date") return <TextField key={idx} type="date" {...common} InputLabelProps={{ shrink: true }} />;
//           return <TextField key={idx} type="text" {...common} />;
//         })}
//       </Stack>
//     </div>
//   );
// }

// /* ==========================
//    NEW: ChartView
//    ========================== */
// function ChartView({ chartId, width, height }) {
//   const [meta, setMeta] = useState(null);
//   const [state, setState] = useState({ loading: true, points: [], xKey: "x", yKey: "y", error: null, tried: [] });

//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       const tried = [];
//       try {
//         // Load meta (try both /chart-configs/:id and /charts/:id)
//         let metaResp = await tryGet(`/chart-configs/${chartId}`);
//         if (!metaResp.ok) metaResp = await tryGet(`/charts/${chartId}`);
//         if (alive && metaResp.ok) setMeta(metaResp.data);

//         const endpoints = buildChartDataEndpoints(chartId, metaResp.ok ? metaResp.data : null);

//         for (const ep of endpoints) {
//           tried.push(ep);
//           const resp = await tryGet(ep);
//           if (resp.ok) {
//             const norm = normalizeChartData(resp.data);
//             if (alive) setState({ loading: false, points: norm.points, xKey: norm.xKey, yKey: norm.yKey, error: null, tried });
//             return;
//           }
//         }

//         if (alive) setState({ loading: false, points: [], xKey: "x", yKey: "y", error: `No chart data endpoint responded (tried ${endpoints.length}).`, tried });
//       } catch (e) {
//         if (alive) setState({ loading: false, points: [], xKey: "x", yKey: "y", error: e?.message || "Error", tried });
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [chartId]);

//   if (state.loading) return <div style={{ fontSize: 12, opacity: 0.6 }}>Loading chart…</div>;
//   if (state.error) {
//     console.warn("Chart data fetch error", state);
//     return (
//       <div style={{ fontSize: 12, color: "#c62828", lineHeight: 1.4 }}>
//         <div>
//           <strong>Chart #{chartId}</strong> failed to load.
//         </div>
//         <div>{state.error}</div>
//         {!!state.tried.length && (
//           <div style={{ marginTop: 6, opacity: 0.8 }}>
//             Tried:
//             <ul style={{ margin: "4px 0 0 16px" }}>
//               {state.tried.map((t) => (
//                 <li key={t} style={{ wordBreak: "break-all" }}>
//                   {t}
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}
//       </div>
//     );
//   }
//   if (!state.points.length) return <div style={{ fontSize: 12, opacity: 0.6 }}>No chart data</div>;

//   const W = Math.max(160, (width || 320));
//   const H = Math.max(120, (height || 200));
//   const margin = 24;
//   const innerW = Math.max(10, W - margin * 2);
//   const innerH = Math.max(10, H - margin * 2);

//   const ymax = Math.max(...state.points.map((p) => (isFinite(p.y) ? p.y : 0)), 0);
//   const ymin = 0;
//   const n = state.points.length;
//   const stepX = innerW / n;
//   const barWidth = Math.max(4, stepX * 0.6);
//   const yScale = (v) => (ymax === ymin ? margin + innerH : margin + innerH - ((v - ymin) / (ymax - ymin)) * innerH);

//   const typeHint = (meta?.chart_type || meta?.type || meta?.config?.type || "").toString().toLowerCase();
//   const isLine = typeHint.includes("line");
//   const isBar = !isLine;

//   return (
//     <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
//       <svg width={W} height={H} role="img" aria-label={`Chart ${chartId}`} style={{ display: "block" }}>
//         <line x1={margin} y1={margin + innerH} x2={margin + innerW} y2={margin + innerH} stroke="#90a4ae" strokeWidth="1" />
//         <line x1={margin} y1={margin} x2={margin} y2={margin + innerH} stroke="#90a4ae" strokeWidth="1" />

//         {isBar &&
//           state.points.map((p, i) => {
//             const cx = margin + i * stepX + stepX / 2;
//             const y = yScale(p.y);
//             const h = Math.max(0, margin + innerH - y);
//             return <rect key={i} x={cx - barWidth / 2} y={y} width={barWidth} height={h} fill="#64b5f6" opacity="0.9" />;
//           })}

//         {isLine && state.points.length > 0 && (
//           <>
//             <polyline
//               fill="none"
//               stroke="#42a5f5"
//               strokeWidth="2"
//               points={state.points.map((p, i) => `${margin + i * stepX + stepX / 2},${yScale(p.y)}`).join(" ")}
//             />
//             {state.points.map((p, i) => (
//               <circle key={i} cx={margin + i * stepX + stepX / 2} cy={yScale(p.y)} r="2.8" fill="#1e88e5" />
//             ))}
//           </>
//         )}

//         <text x={margin - 6} y={yScale(ymax)} fontSize="10" textAnchor="end" fill="#607d8b">
//           {ymax}
//         </text>
//       </svg>
//       <div style={{ fontSize: 10, opacity: 0.7, padding: "2px 6px" }}>
//         {state.xKey} vs {state.yKey}
//       </div>
//     </div>
//   );
// }

// /* ==========================
//    Shell (list + modal)
//    ========================== */
// export default function UICreator() {
//   const [list, setList] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(10);
//   const [q, setQ] = useState("");

//   const [modalOpen, setModalOpen] = useState(false);
//   const [mode, setMode] = useState("edit"); // 'edit' | 'view'
//   const [initial, setInitial] = useState(null);

//   const loadList = async () => {
//     const { data } = await api.get("/canvas-configs", { params: { page, pageSize, q } });
//     setList(data.items || []);
//     setTotal(data.total || 0);
//   };
//   useEffect(() => {
//     loadList();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, pageSize, q]);

//   const openNew = () => {
//     setInitial(null);
//     setMode("edit");
//     setModalOpen(true);
//   };
//   const openView = async (id) => {
//     const { data } = await api.get(`/canvas-configs/${id}`);
//     setInitial(data);
//     setMode("view");
//     setModalOpen(true);
//   };
//   const openEdit = async (id) => {
//     const { data } = await api.get(`/canvas-configs/${id}`);
//     setInitial(data);
//     setMode("edit");
//     setModalOpen(true);
//   };
//   const handleArchive = async (id) => {
//     if (!window.confirm("Archive this canvas?")) return;
//     await api.patch(`/canvas-configs/${id}/archive`, { updated_by: 1 });
//     loadList();
//   };

//   return (
//     <Box p={2}>
//       <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
//         <Stack direction="row" gap={2} alignItems="center">
//           <TextField size="small" label="Search" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
//           <Button size="small" onClick={() => { setQ(""); setPage(1); }}>Clear</Button>
//         </Stack>
//         <Button variant="contained" onClick={openNew}>Create New Canvas</Button>
//       </Stack>

//       <TableContainer>
//         <Table size="small">
//           <TableHead>
//             <TableRow>
//               <TableCell sx={{ width: "40%" }}>Name</TableCell>
//               <TableCell>Description</TableCell>
//               <TableCell align="right" sx={{ width: 200 }}>Actions</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {list.map((r) => (
//               <TableRow key={r.id} hover>
//                 <TableCell>{r.canvas_name}</TableCell>
//                 <TableCell>{r.description}</TableCell>
//                 <TableCell align="right">
//                   <Tooltip title="View"><IconButton onClick={() => openView(r.id)}><VisibilityIcon /></IconButton></Tooltip>
//                   <Tooltip title="Edit"><IconButton onClick={() => openEdit(r.id)}><EditIcon /></IconButton></Tooltip>
//                   <Tooltip title="Delete (Archive)"><IconButton onClick={() => handleArchive(r.id)}><DeleteIcon /></IconButton></Tooltip>
//                 </TableCell>
//               </TableRow>
//             ))}
//             {list.length === 0 && (
//               <TableRow><TableCell colSpan={3} align="center">No canvases yet</TableCell></TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </TableContainer>
//       <Stack alignItems="center" sx={{ mt: 2 }}>
//         <Pagination count={Math.max(1, Math.ceil(total / pageSize))} page={page} onChange={(_, p) => setPage(p)} />
//       </Stack>

//       <CreateCanvasModal
//         open={modalOpen}
//         mode={mode}
//         initial={initial}
//         onClose={() => setModalOpen(false)}
//         onSaved={() => { setModalOpen(false); loadList(); }}
//       />
//     </Box>
//   );
// }

// /* ==========================
//    Modal Editor
//    ========================== */
// function CreateCanvasModal({ open, mode = "edit", onClose, onSaved, initial }) {
//   // Grid
//   const COLS = 108; const ROWS = 54; const CELL = 12;

//   // Layout state
//   const [blocks, setBlocks] = useState([]); // {id,r1,c1,r2,c2, props, component}
//   const [occupied, setOccupied] = useState(new Set());
//   const [canvasBg, setCanvasBg] = useState("#f2f4f7");

//   // Selection
//   const [selecting, setSelecting] = useState(false);
//   const [selStart, setSelStart] = useState(null);
//   const [selEnd, setSelEnd] = useState(null);
//   const idRef = useRef(1);

//   // Menus & dialogs
//   const [menuAnchor, setMenuAnchor] = useState(null);
//   const [menuBlockId, setMenuBlockId] = useState(null);
//   const [bgDialogOpen, setBgDialogOpen] = useState(false);
//   const [cfgOpen, setCfgOpen] = useState(false);

//   // Config dialog state
//   const [cfgType, setCfgType] = useState("");
//   const [cfgTableId, setCfgTableId] = useState("");
//   const [cfgFormId, setCfgFormId] = useState("");
//   const [cfgChartId, setCfgChartId] = useState("");
//   const [cfgText, setCfgText] = useState("");
//   const [cfgTextColor, setCfgTextColor] = useState("#222222");
//   const [cfgTextSize, setCfgTextSize] = useState(14);
//   const [tables, setTables] = useState([]);
//   const [forms, setForms] = useState([]);
//   const [charts, setCharts] = useState([]);

//   // Meta
//   const [canvasId, setCanvasId] = useState(null);
//   const [canvasName, setCanvasName] = useState("");
//   const [canvasDesc, setCanvasDesc] = useState("");
//   const [saving, setSaving] = useState(false);

//   // Hydrate from initial
//   useEffect(() => {
//     if (!open) return;
//     if (initial) {
//       const cfg = initial.canvas_config || {};
//       setCanvasId(initial.id);
//       setCanvasName(initial.canvas_name || "");
//       setCanvasDesc(initial.description || "");
//       setCanvasBg(cfg.grid?.background || "#f2f4f7");
//       setBlocks(cfg.blocks || []);
//       const occ = new Set();
//       (cfg.blocks || []).forEach((b) => {
//         for (let r = b.r1; r <= b.r2; r++) {
//           for (let c = b.c1; c <= b.c2; c++) occ.add(r * COLS + c);
//         }
//       });
//       setOccupied(occ);
//       idRef.current = Math.max(1, ...((cfg.blocks || []).map((b) => b.id + 1)));
//     } else {
//       setCanvasId(null); setCanvasName(""); setCanvasDesc("");
//       setCanvasBg("#f2f4f7"); setBlocks([]); setOccupied(new Set()); idRef.current = 1;
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open, initial]);

//   // Lookups for config dialog
//   useEffect(() => {
//     let active = true;
//     if (!cfgOpen) return;

//     (async () => {
//       try {
//         const [tRes, fRes] = await Promise.all([api.get("/table-configs"), api.get("/form-configs/masters")]);
//         if (active) {
//           setTables(coerceArray(tRes.data));
//           setForms(coerceArray(fRes.data));
//         }
//       } catch (e) {
//         console.warn("Lookup fetch (tables/forms) failed", e);
//       }

//       // Charts: try multiple endpoints, first one that returns an array wins
//       const chartEndpoints = ["/chart-configs/masters", "/chart-configs", "/charts", "/chart-configs/list"];
//       for (const p of chartEndpoints) {
//         const res = await tryGet(p);
//         if (res.ok) {
//           const list = coerceArray(res.data).map((c) => ({
//             id: c.id,
//             name: c.chart_name || c.name || c.title || `Chart ${c.id}`,
//           }));
//           if (active) setCharts(list);
//           if (list.length) break;
//         }
//       }
//     })();

//     return () => { active = false; };
//   }, [cfgOpen]);

//   // Helpers
//   const rcFromIndex = (i) => [Math.floor(i / COLS), i % COLS];
//   const indexFromRC = (r, c) => r * COLS + c;
//   const rect = useMemo(() => {
//     if (selStart == null || selEnd == null) return null;
//     const [r1, c1] = rcFromIndex(selStart); const [r2, c2] = rcFromIndex(selEnd);
//     return { r1: Math.min(r1, r2), c1: Math.min(c1, c2), r2: Math.max(r1, r2), c2: Math.max(c1, c2) };
//   }, [selStart, selEnd]);
//   const indicesInRect = (r) => { const out = []; for (let rr = r.r1; rr <= r.r2; rr++) { for (let cc = r.c1; cc <= r.c2; cc++) out.push(indexFromRC(rr, cc)); } return out; };
//   const canMerge = (r) => { if (!r) return false; for (const idx of indicesInRect(r)) if (occupied.has(idx)) return false; return true; };

//   const handleMerge = () => {
//     if (!rect || !canMerge(rect) || mode === "view") return;
//     const id = idRef.current++;
//     const newBlock = { id, ...rect, props: { corner: "rounded" }, component: { type: null } };
//     setBlocks((prev) => [...prev, newBlock]);
//     const occ = new Set(occupied); indicesInRect(rect).forEach((i) => occ.add(i)); setOccupied(occ);
//     setSelecting(false); setSelStart(null); setSelEnd(null);
//   };

//   const unmerge = (id) => {
//     if (mode === "view") return;
//     const blk = blocks.find((b) => b.id === id); if (!blk) return;
//     const occ = new Set(occupied); indicesInRect(blk).forEach((i) => occ.delete(i)); setOccupied(occ);
//     setBlocks((prev) => prev.filter((b) => b.id !== id));
//   };

//   // Drag/resize
//   const [drag, setDrag] = useState(null); // {mode:'move'|'resize', id, startX, startY, orig, preview}
//   const cellsForRect = (r) => { const out = []; for (let rr = r.r1; rr <= r.r2; rr++) { for (let cc = r.c1; cc <= r.c2; cc++) out.push(indexFromRC(rr, cc)); } return out; };
//   const canPlaceRect = (r, ignoreId = null) => {
//     if (!r) return false;
//     if (r.r1 < 0 || r.c1 < 0 || r.r2 >= ROWS || r.c2 >= COLS) return false;
//     const occ = new Set(occupied);
//     if (ignoreId != null) {
//       const blk = blocks.find(b => b.id === ignoreId);
//       if (blk) cellsForRect(blk).forEach(i => occ.delete(i));
//     }
//     for (const idx of cellsForRect(r)) if (occ.has(idx)) return false;
//     return true;
//   };
//   const startMove = (e, b) => { if (mode==='view') return; e.stopPropagation(); setDrag({ mode:'move', id:b.id, startX:e.clientX, startY:e.clientY, orig:{ r1:b.r1,c1:b.c1,r2:b.r2,c2:b.c2 }, preview:null }); };
//   const startResize = (e, b) => { if (mode==='view') return; e.stopPropagation(); setDrag({ mode:'resize', id:b.id, startX:e.clientX, startY:e.clientY, orig:{ r1:b.r1,c1:b.c1,r2:b.r2,c2:b.c2 }, preview:null }); };

//   useEffect(() => {
//     if (!drag) return;
//     const onMove = (e) => {
//       const dx = e.clientX - drag.startX; const dy = e.clientY - drag.startY;
//       const dc = Math.round(dx / CELL); const dr = Math.round(dy / CELL);
//       let r;
//       if (drag.mode === 'move') {
//         r = { r1: drag.orig.r1 + dr, c1: drag.orig.c1 + dc, r2: drag.orig.r2 + dr, c2: drag.orig.c2 + dc };
//       } else {
//         r = { ...drag.orig, r2: Math.max(drag.orig.r1, drag.orig.r2 + dr), c2: Math.max(drag.orig.c1, drag.orig.c2 + dc) };
//       }
//       r.r1 = Math.max(0, Math.min(ROWS-1, r.r1));
//       r.c1 = Math.max(0, Math.min(COLS-1, r.c1));
//       r.r2 = Math.max(0, Math.min(ROWS-1, r.r2));
//       r.c2 = Math.max(0, Math.min(COLS-1, r.c2));
//       setDrag((d) => ({ ...d, preview: r }));
//     };
//     const onUp = () => {
//       if (drag.preview && canPlaceRect(drag.preview, drag.id)) {
//         setBlocks((prev) => prev.map(b => b.id === drag.id ? { ...b, ...drag.preview } : b));
//         const blk = blocks.find(b => b.id === drag.id);
//         const occ = new Set(occupied);
//         if (blk) cellsForRect(blk).forEach(i => occ.delete(i));
//         cellsForRect(drag.preview).forEach(i => occ.add(i));
//         setOccupied(occ);
//       }
//       setDrag(null);
//     };
//     window.addEventListener('mousemove', onMove);
//     window.addEventListener('mouseup', onUp);
//     return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
//   }, [drag, blocks, occupied]); // eslint-disable-line react-hooks/exhaustive-deps

//   const startSel = (i) => { if (mode === 'view') return; setSelecting(true); setSelStart(i); setSelEnd(i); };
//   const moveSel = (i) => { if (!selecting) return; setSelEnd(i); };
//   const endSel = () => setSelecting(false);

//   const clearAll = () => { if (mode === 'view') return; setBlocks([]); setOccupied(new Set()); setSelecting(false); setSelStart(null); setSelEnd(null); idRef.current = 1; };

//   const layoutData = useMemo(() => ({ grid: { cols: COLS, rows: ROWS, cellPx: CELL, background: canvasBg }, blocks }), [blocks, canvasBg]);
//   const getUserId = () => Number(localStorage.getItem("userId")) || 1;

//   const doSave = async () => {
//     if (mode === "view") return onClose();
//     try {
//       setSaving(true);
//       const payload = { canvas_name: canvasName || "Untitled Canvas", description: canvasDesc || null, canvas_config: layoutData, org_id: Number(localStorage.getItem("orgId")) || null };
//       let res;
//       if (canvasId) res = await api.put(`/canvas-configs/${canvasId}`, { ...payload, updated_by: getUserId() });
//       else res = await api.post(`/canvas-configs`, { ...payload, created_by: getUserId() });
//       const row = res.data; setCanvasId(row.id); onSaved && onSaved(row);
//     } catch (err) {
//       console.error("Save failed", err); alert(err?.response?.data?.message || "Failed to save canvas");
//     } finally { setSaving(false); }
//   };

//   // Block menu
//   const openBlockMenu = (evt, id) => { setMenuAnchor(evt.currentTarget); setMenuBlockId(id); };
//   const closeBlockMenu = () => setMenuAnchor(null);
//   const setCorner = (style) => { setBlocks((prev) => prev.map((b) => (b.id === menuBlockId ? { ...b, props: { ...b.props, corner: style } } : b))); closeBlockMenu(); };
//   const openConfigure = () => {
//     const blk = blocks.find((b) => b.id === menuBlockId); const comp = blk?.component || { type: null };
//     setCfgType(comp.type || "");
//     setCfgTableId(comp.table_id || "");
//     setCfgFormId(comp.form_id || "");
//     setCfgChartId(comp.chart_id || "");
//     setCfgText(comp.html || "");
//     setCfgTextColor(comp.color || "#222222");
//     setCfgTextSize(comp.fontSize || 14);
//     setCfgOpen(true); closeBlockMenu();
//   };
//   const applyConfigure = () => {
//     setBlocks((prev) => prev.map((b) => (
//       b.id === menuBlockId
//         ? {
//             ...b,
//             component:
//               cfgType === "table" ? { type: "table", table_id: Number(cfgTableId) || null } :
//               cfgType === "form"  ? { type: "form",  form_id: Number(cfgFormId) || null }  :
//               cfgType === "chart" ? { type: "chart", chart_id: Number(cfgChartId) || null } :
//               cfgType === "text"  ? { type: "text",  html: cfgText, color: cfgTextColor, fontSize: Number(cfgTextSize) || 14 } :
//               { type: null }
//           }
//         : b
//     )));
//     setCfgOpen(false);
//   };

//   // Renderer for each block
//   const renderBlock = (b, widthPx, heightPx) => {
//     const comp = b.component || {};
//     if (comp.type === "table" && comp.table_id) return <TableView tableId={comp.table_id} width={widthPx} height={heightPx} />;
//     if (comp.type === "form" && comp.form_id) return <FormView formId={comp.form_id} width={widthPx} height={heightPx} />;
//     if (comp.type === "chart" && comp.chart_id) return <ChartView chartId={comp.chart_id} width={widthPx} height={heightPx} />;
//     if (comp.type === "text") return <div style={{ color: comp.color, fontSize: comp.fontSize, height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: comp.html }} />;
//     return <div style={{ fontSize: 12, opacity: 0.6 }}>Configure…</div>;
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
//       <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//         {mode === "view" ? "View Canvas" : "New Canvas"} (108 × 54)
//         <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
//       </DialogTitle>

//       <DialogContent dividers>
//         <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
//           <TextField label="Canvas name" size="small" value={canvasName} onChange={(e) => setCanvasName(e.target.value)} disabled={mode==='view'} />
//           <TextField label="Description" size="small" value={canvasDesc} onChange={(e) => setCanvasDesc(e.target.value)} disabled={mode==='view'} sx={{ flex: 1 }} />
//         </Stack>
//         {mode !== "view" && (
//           <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
//             <Button variant="contained" onClick={handleMerge} disabled={!rect || !canMerge(rect)}>Merge selection</Button>
//             <Button variant="outlined" onClick={clearAll}>Clear</Button>
//           </Stack>
//         )}

//         {/* Scroll container */}
//         <div style={{ position: "relative", width: "100%", maxWidth: "100%", overflow: "auto", border: "1px solid #c5ced6", borderRadius: 8, background: "#fff" }} onMouseLeave={endSel}>
//           <div style={{ position: "relative", width: COLS * CELL + 2, height: ROWS * CELL + 2 }}>
//             {/* Base grid */}
//             <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gridTemplateRows: `repeat(${ROWS}, ${CELL}px)` }}>
//               {Array.from({ length: COLS * ROWS }, (_, i) => (
//                 <div key={i} onMouseDown={() => startSel(i)} onMouseEnter={() => moveSel(i)} onMouseUp={endSel} style={{ width: CELL, height: CELL, border: "1px solid #9fb2c2", background: canvasBg }} />
//               ))}
//             </div>

//             {/* Selection overlay */}
//             {rect && mode !== "view" && (
//               <div style={{ position: "absolute", left: rect.c1 * CELL, top: rect.r1 * CELL, width: (rect.c2 - rect.c1 + 1) * CELL, height: (rect.r2 - rect.r1 + 1) * CELL, background: "rgba(25,118,210,0.12)", outline: `2px solid ${canMerge(rect) ? "#1976d2" : "#e53935"}`, pointerEvents: "none", borderRadius: 6 }} />
//             )}

//             {/* Merged blocks */}
//             {blocks.map((b) => {
//               const widthPx = (b.c2 - b.c1 + 1) * CELL;
//               const heightPx = (b.r2 - b.r1 + 1) * CELL;

//               return (
//                 <div
//                   key={b.id}
//                   style={{
//                     position: "absolute",
//                     left: b.c1 * CELL,
//                     top: b.r1 * CELL,
//                     width: widthPx,
//                     height: heightPx,
//                     border: "2px solid #000",
//                     borderRadius: b.props?.corner === "square" ? 4 : 10,
//                     background: "#fff",
//                     boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
//                     overflow: "hidden",
//                   }}
//                 >
//                   {mode !== "view" && (
//                     <>
//                       {/* drag handle */}
//                       <div
//                         onMouseDown={(e) => startMove(e, b)}
//                         title="Drag"
//                         style={{
//                           position: "absolute",
//                           left: 6,
//                           top: 6,
//                           width: 14,
//                           height: 14,
//                           borderRadius: 4,
//                           background: "#e9eef3",
//                           border: "1px solid #b7c5d1",
//                           cursor: "move",
//                         }}
//                       />
//                       {/* menu */}
//                       <IconButton
//                         size="small"
//                         onClick={(e) => openBlockMenu(e, b.id)}
//                         sx={{ position: "absolute", left: 4, bottom: 4, bgcolor: "#fff", boxShadow: 1, zIndex: 2, p: "2px" }}
//                       >
//                         <MoreHorizIcon fontSize="inherit" />
//                       </IconButton>
//                     </>
//                   )}

//                   {/* CONTENT */}
//                   <div
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       boxSizing: "border-box",
//                       padding: "12px 20px 12px 12px",
//                       display: "flex",
//                       flexDirection: "column",
//                       minWidth: 0,
//                     }}
//                   >
//                     {renderBlock(b, widthPx - 16, heightPx - 16)}
//                   </div>

//                   {mode !== "view" && (
//                     <>
//                       <IconButton
//                         size="small"
//                         onClick={() => unmerge(b.id)}
//                         sx={{ position: "absolute", right: -12, top: -12, bgcolor: "#000", color: "#fff", "&:hover": { bgcolor: "#333" } }}
//                         title="Unmerge"
//                       >
//                         <CloseIcon fontSize="inherit" />
//                       </IconButton>

//                       {/* resize */}
//                       <div
//                         onMouseDown={(e) => startResize(e, b)}
//                         title="Resize"
//                         style={{
//                           position: "absolute",
//                           right: 2,
//                           bottom: 2,
//                           width: 12,
//                           height: 12,
//                           cursor: "nwse-resize",
//                           borderRight: "2px solid #9fb2c2",
//                           borderBottom: "2px solid #9fb2c2",
//                         }}
//                       />
//                     </>
//                   )}
//                 </div>
//               );
//             })}

//             {/* Drag preview */}
//             {drag?.preview && (
//               <div
//                 style={{
//                   position: "absolute",
//                   left: drag.preview.c1 * CELL,
//                   top: drag.preview.r1 * CELL,
//                   width: (drag.preview.c2 - drag.preview.c1 + 1) * CELL,
//                   height: (drag.preview.r2 - drag.preview.r1 + 1) * CELL,
//                   outline: `2px dashed ${canPlaceRect(drag.preview, drag.id) ? "#1976d2" : "#e53935"}`,
//                   pointerEvents: "none",
//                   borderRadius: 8,
//                 }}
//               />
//             )}
//           </div>
//         </div>

//         {/* Block menu */}
//         <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeBlockMenu}>
//           <MenuItem onClick={() => { setBgDialogOpen(true); closeBlockMenu(); }}>Canvas background…</MenuItem>
//           <Divider />
//           <MenuItem onClick={() => setCorner("rounded")}>Corner: Rounded</MenuItem>
//           <MenuItem onClick={() => setCorner("square")}>Corner: Square</MenuItem>
//           <Divider />
//           <MenuItem onClick={openConfigure}>Configure content…</MenuItem>
//           <Divider />
//           <MenuItem onClick={() => { unmerge(menuBlockId); closeBlockMenu(); }}>Remove block</MenuItem>
//         </Menu>

//         {/* Canvas background dialog */}
//         <Dialog open={bgDialogOpen} onClose={() => setBgDialogOpen(false)}>
//           <DialogTitle>Canvas background</DialogTitle>
//           <DialogContent>
//             <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
//               <input type="color" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} />
//               <TextField size="small" label="Hex" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} />
//             </Stack>
//           </DialogContent>
//           <DialogActions><Button onClick={() => setBgDialogOpen(false)}>Close</Button></DialogActions>
//         </Dialog>

//         {/* Configure component dialog */}
//         <Dialog open={cfgOpen} onClose={() => setCfgOpen(false)} maxWidth="sm" fullWidth>
//           <DialogTitle>Configure content</DialogTitle>
//           <DialogContent dividers>
//             <FormControl fullWidth sx={{ mt: 1 }}>
//               <InputLabel>Type</InputLabel>
//               <Select label="Type" value={cfgType} onChange={(e) => setCfgType(e.target.value)}>
//                 <MenuItem value={"table"}>Table</MenuItem>
//                 <MenuItem value={"form"}>Form</MenuItem>
//                 <MenuItem value={"text"}>Text</MenuItem>
//                 <MenuItem value={"chart"}>Chart</MenuItem>
//               </Select>
//             </FormControl>

//             {cfgType === "table" && (
//               <FormControl fullWidth sx={{ mt: 2 }}>
//                 <InputLabel>Table (from table_config)</InputLabel>
//                 <Select label="Table (from table_config)" value={cfgTableId} onChange={(e) => setCfgTableId(e.target.value)}>
//                   {tables.map((t) => (<MenuItem key={t.id} value={t.id}>{t.table_name}</MenuItem>))}
//                 </Select>
//               </FormControl>
//             )}

//             {cfgType === "form" && (
//               <FormControl fullWidth sx={{ mt: 2 }}>
//                 <InputLabel>Form (from form_configs)</InputLabel>
//                 <Select label="Form (from form_configs)" value={cfgFormId} onChange={(e) => setCfgFormId(e.target.value)}>
//                   {forms.map((f) => (<MenuItem key={f.id} value={f.id}>{f.template_name}</MenuItem>))}
//                 </Select>
//               </FormControl>
//             )}

//             {cfgType === "chart" && (
//               <FormControl fullWidth sx={{ mt: 2 }}>
//                 <InputLabel>Chart (from chart_configs)</InputLabel>
//                 <Select label="Chart (from chart_configs)" value={cfgChartId} onChange={(e) => setCfgChartId(e.target.value)}>
//                   {charts.length === 0 && <MenuItem disabled value="">No charts found</MenuItem>}
//                   {charts.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
//                 </Select>
//               </FormControl>
//             )}

//             {cfgType === "text" && (
//               <Stack spacing={2} sx={{ mt: 2 }}>
//                 <TextField label="Text" multiline minRows={3} value={cfgText} onChange={(e) => setCfgText(e.target.value)} />
//                 <Stack direction="row" spacing={2} alignItems="center">
//                   <TextField type="color" label="Color" value={cfgTextColor} onChange={(e) => setCfgTextColor(e.target.value)} sx={{ width: 120 }} />
//                   <TextField type="number" label="Font size" value={cfgTextSize} onChange={(e) => setCfgTextSize(e.target.value)} sx={{ width: 160 }} />
//                 </Stack>
//               </Stack>
//             )}
//           </DialogContent>
//           <DialogActions>
//             <Button onClick={() => setCfgOpen(false)}>Cancel</Button>
//             <Button variant="contained" onClick={applyConfigure}>Apply</Button>
//           </DialogActions>
//         </Dialog>
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={onClose}>{mode === "view" ? "Close" : "Cancel"}</Button>
//         {mode !== "view" && (
//           <Button variant="contained" onClick={doSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
//         )}
//       </DialogActions>
//     </Dialog>
//   );
// }
// //COMMENTED TO ADD UPDATED CODE