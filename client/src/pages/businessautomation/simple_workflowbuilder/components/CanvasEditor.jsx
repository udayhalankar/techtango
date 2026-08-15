// CanvasEditor.jsx (beta)
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { TextField as MuiTextField, Checkbox as MuiCheckbox, Radio as MuiRadio, RadioGroup, FormControlLabel, MenuItem, Button as MuiButton, Paper as MuiPaper, Stack as MuiStack, Typography as MuiTypography, IconButton as MuiIconButton, Divider as MuiDivider, ToggleButton, ToggleButtonGroup, Tooltip as MuiTooltip } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';

export default function CanvasEditor({
  cols = 72,
  rows = 24,
  rowHeight = 8,
  items = [],
  onChange,
  allowFields = false,
  fields = [], // [{column,label}]
  canAdd = true,
  canDelete = true,
  canEditProps = true,
  onUndo, // optional: called on Ctrl/Cmd+Z
  onRedo, // optional: called on Ctrl+Y or Ctrl+Shift+Z
  showCellRef = true, // always show minimal grid ref label
  sectionId,
  onGrowRows, // optional: (sectionId, deltaRows:number) => void
  labelStyle = 'side',
}) {
  const [anchor, setAnchor] = useState(null); // {c,r}
  const [sel, setSel] = useState(null);       // {x,y,w,h}
  const [selecting, setSelecting] = useState(false);
  const [menu, setMenu] = useState(null);   // {x,y}
  const [editMenu, setEditMenu] = useState(null); // {x,y,itemId}
  const [drag, setDrag] = useState(null);   // {id, ids, mode:'move'|'resize', startX, startY, startRect, startRects, startCell, lastGood}
  const [draggingId, setDraggingId] = useState(null);
  const [liveRect, setLiveRect] = useState(null); // transient rect used during drag only
  const [liveRects, setLiveRects] = useState(null); // { [id]: rect } for multi-drag
  const [menuField, setMenuField] = useState('');
  const rootRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [debug, setDebug] = useState(false); // toggle with 'D'
  const [cursorCell, setCursorCell] = useState({ c: 0, r: 0 });
  const debugInfoRef = useRef({}); // last calc info during drag/resize
  const [tip, setTip] = useState("");
  const tipTimer = useRef(null);
  const nearBottomRef = useRef(false);
  const growPendingRef = useRef(false);
  const lastRowsRef = useRef(rows);
  const preferDownRef = useRef(true);
  const rteRef = useRef(null); // rich text editor ref (contenteditable)
  const lastEditIdRef = useRef(null);


  // Minimal sanitizer for inline HTML from contenteditable
  function sanitizeHtml(html){
    try{
      const tpl = document.createElement('template');
      tpl.innerHTML = html || '';
      const ALLOW_TAG = new Set(['B','STRONG','I','EM','U','SPAN','DIV','BR']);
      const ALLOW_STYLE = new Set(['color','background-color']);
      const walk = (node)=>{
        const children = Array.from(node.childNodes);
        for (const ch of children){
          if (ch.nodeType === 1){
            const el = ch;
            if (!ALLOW_TAG.has(el.tagName)){
              // unwrap: move its children up then remove
              while (el.firstChild) node.insertBefore(el.firstChild, el);
              node.removeChild(el);
              continue;
            }
            // scrub attributes except style
            [...el.attributes].forEach(attr=>{
              if (attr.name.toLowerCase() !== 'style') el.removeAttribute(attr.name);
            });
            // filter style
            if (el.hasAttribute('style')){
              const style = el.getAttribute('style')||'';
              const filtered = style.split(';').map(s=>s.trim()).filter(Boolean).filter(rule=>{
                const k = rule.split(':')[0]?.trim().toLowerCase();
                return ALLOW_STYLE.has(k);
              }).join('; ');
              if (filtered) el.setAttribute('style', filtered); else el.removeAttribute('style');
            }
            walk(el);
          } else if (ch.nodeType === 8){
            node.removeChild(ch); // remove comments
          }
        }
      };
      walk(tpl.content || tpl);
      return (tpl.innerHTML || '').trim();
    }catch{ return html || ''; }
  }

  function showGrowRowsTip(msg = "Not enough grid rows. Use + rows to add space.") {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    setTip(msg);
    tipTimer.current = setTimeout(() => setTip(""), 2500);
  }

  // Reset throttling when parent rows actually change
  React.useEffect(()=>{
    if (rows !== lastRowsRef.current){
      lastRowsRef.current = rows;
      growPendingRef.current = false;
    }
  }, [rows]);

  const cells = useMemo(() => {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) arr.push({ c, r });
    }
    return arr;
  }, [cols, rows]);

  function toRect(a, b) {
    if (!a || !b) return null;
    const x = Math.min(a.c, b.c);
    const y = Math.min(a.r, b.r);
    const w = Math.abs(a.c - b.c) + 1;
    const h = Math.abs(a.r - b.r) + 1;
    return { x, y, w, h };
  }

  // Layout constants (lighter + tighter canvas)
  const PADDING = 10;   // canvas inner padding from edges
  const COL_GAP = 12;   // horizontal gap between items in the same row
  const ROW_GAP = 4;    // vertical gap for clearer row separation

  function onGridMouseDown(e) {
    if (!canAdd) return; // move/resize only
    setSelectedId(null);
    setSelectedIds([]);
    const cell = mouseToCell(e);
    setAnchor(cell);
    setSel({ x: cell.c, y: cell.r, w: 1, h: 1 });
    setSelecting(true);
    setMenu(null);
  }
  function onGridMouseMove(e) {
    if (!selecting || !anchor) return;
    const cell = mouseToCell(e);
    const r = toRect(anchor, cell);
    setSel(r);
  }

  function apply(type) {
    if (!sel) return;
    const id = `i_${Date.now()}`;
    // enforce sensible defaults per type
    let w = Math.max(3, sel.w);
    let h = sel.h;
    if (type === 'line') h = Math.max(2, h);
    else h = Math.max(6, h);
    const base = { id, type, x: sel.x, y: sel.y, w, h, props: {} };
    if (type === 'text') base.props = { text: 'Text', textAlign: 'left', fontSize: 14 };
    if (type === 'image') base.props = { src: '', alt: '', maxHeight: 48 };
    if (type === 'line') base.props = { thickness: 2, color: '#cbd5e1' };
    const next = [...(items || []), base];
    onChange?.(next);
    setMenu(null);
    setSel(null);
  }

  function applyField() {
    if (!sel || !menuField) return;
    const id = `f_${Date.now()}`;
    const base = { id, type: 'field', field: menuField, x: sel.x, y: sel.y, w: Math.max(3, sel.w), h: Math.max(6, sel.h), props: {} };
    const next = [...(items || []), base];
    onChange?.(next);
    setMenu(null);
    setSel(null);
    setMenuField('');
  }

  // Light gradient background for the canvas surface (per reference)
  const gridBg = undefined;
  const gridStyle = {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
    gridAutoRows: `${rowHeight}px`,
    columnGap: COL_GAP,
    rowGap: ROW_GAP,
    direction: 'ltr',
    // Overlay grid lines on top of a soft vertical gradient
    backgroundImage:
      `linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px),` +
      `linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px),` +
      `linear-gradient(180deg, #FAFAFB 0%, #F3F4F6 60%, #ECEEF2 100%)`,
    backgroundSize: `${rowHeight}px ${rowHeight}px`,
    backgroundBlendMode: 'normal, normal, multiply',
    backgroundColor: gridBg,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: PADDING,
    userSelect: 'none',
    // Soft surface like WordPress canvas
    boxShadow: '0 6px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.70)'
  };

  const cellStyle = {
    width: '100%',
    height: `${rowHeight}px`,
  };

  const selGridOverlay = sel
    ? {
        gridColumn: `${sel.x + 1} / span ${sel.w}`,
        gridRow: `${sel.y + 1} / span ${sel.h}`,
        border: '2px solid #2563eb',
        borderRadius: 4,
        background: 'transparent',
        pointerEvents: 'none',
      }
    : null;

  // Helpers for dragging/resizing
  function rectsOverlap(a,b){
    if (!a||!b) return false;
    return a.x < (b.x + b.w) && (a.x + a.w) > b.x && a.y < (b.y + b.h) && (a.y + a.h) > b.y;
  }
  function clampRect(r){
    return {
      x: Math.max(0, Math.min(cols - r.w, r.x)),
      y: Math.max(0, Math.min(rows - r.h, r.y)),
      w: Math.max(1, Math.min(cols - r.x, r.w)),
      h: Math.max(1, Math.min(rows - r.y, r.h)),
    };
  }
  function clampRectTo(r, rowsLimit, colsLimit){
    const cl = Math.max(1, colsLimit||cols);
    const rl = Math.max(1, rowsLimit||rows);
    return {
      x: Math.max(0, Math.min(cl - r.w, r.x)),
      y: Math.max(0, Math.min(rl - r.h, r.y)),
      w: Math.max(1, Math.min(cl - r.x, r.w)),
      h: Math.max(1, Math.min(rl - r.y, r.h)),
    };
  }
  function canPlace(id, rect){
    const others = (items||[]).filter(it=>it.id!==id).map(it=>({x:it.x||0,y:it.y||0,w:Math.max(1,it.w||1),h:Math.max(1,it.h||1)}));
    return !others.some(o=>rectsOverlap(o, rect));
  }
  function canPlaceGroup(ids, rectMap){
    const others = (items||[]).filter(it=>!ids.includes(it.id)).map(it=>({x:it.x||0,y:it.y||0,w:Math.max(1,it.w||1),h:Math.max(1,it.h||1)}));
    return Object.values(rectMap).every(r => !others.some(o=>rectsOverlap(o, r)));
  }
  function mouseToCell(e){
    const el = rootRef.current;
    const rect = el?.getBoundingClientRect();
    if (!rect) return {c:0,r:0};
    const cs = window.getComputedStyle(el);
    const bl = parseFloat(cs.borderLeftWidth || '0') || 0;
    const bt = parseFloat(cs.borderTopWidth || '0') || 0;
    const br = parseFloat(cs.borderRightWidth || '0') || 0;
    const innerLeft = rect.left + bl + PADDING;
    const innerTop = rect.top + bt + PADDING;
    const innerW = rect.width - bl - br - 2*PADDING;
    const colW = (innerW - (cols - 1) * COL_GAP) / cols;
    const stepX = colW + COL_GAP;
    const stepY = rowHeight + ROW_GAP;
    const x = e.clientX - innerLeft;
    const y = e.clientY - innerTop;
    const c = Math.max(0, Math.min(cols-1, Math.floor((x + COL_GAP/2) / stepX)));
    const r = Math.max(0, Math.min(rows-1, Math.floor((y + ROW_GAP/2) / stepY)));
    return {c,r};
  }

  function startMove(e, it){
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const next = prev.includes(it.id) ? prev.filter((x) => x !== it.id) : [...prev, it.id];
        setSelectedId(next[0] || null);
        return next;
      });
      return;
    }
    const ids = selectedIds.includes(it.id) ? selectedIds : [it.id];
    const startRects = {};
    ids.forEach((id) => {
      const cur = (items || []).find((x) => x.id === id);
      if (cur) {
        startRects[id] = { x: cur.x || 0, y: cur.y || 0, w: Math.max(1, cur.w || 1), h: Math.max(1, cur.h || 1) };
      }
    });
    setDrag({
      id: it.id,
      ids,
      mode:'move',
      startX:e.clientX,
      startY:e.clientY,
      startRect:{ x:it.x||0, y:it.y||0, w:Math.max(1,it.w||1), h:Math.max(1,it.h||1) },
      startRects,
      startCell: mouseToCell(e),
      lastGood: { ...startRects },
    });
    setDraggingId(it.id);
    setSelectedIds(ids);
    setSelectedId(ids[0] || null);
    setEditMenu(null);
  }
  function startResize(e, it){
    e.stopPropagation();
    if (selectedIds.length > 1) return;
    setDrag({ id: it.id, ids: [it.id], mode:'resize', startX:e.clientX, startY:e.clientY, startRect:{ x:it.x||0, y:it.y||0, w:Math.max(1,it.w||1), h:Math.max(1,it.h||1) }, lastGood:{ [it.id]: { x:it.x||0, y:it.y||0, w:Math.max(1,it.w||1), h:Math.max(1,it.h||1) } } });
    setDraggingId(it.id);
    setEditMenu(null);
  }
  function openEditor(e, it){
    e.stopPropagation();
    const rect = rootRef.current?.getBoundingClientRect();
    setEditMenu({ x: (e.clientX - (rect?.left||0)), y: (e.clientY - (rect?.top||0)), itemId: it.id });
    setSelectedId(it.id);
    setSelectedIds([it.id]);
  }

  // global listeners for drag
  React.useEffect(()=>{
    const rafId = { id: null };
    function onMove(e){
      if (selecting && anchor){
        onGridMouseMove(e);
      }
      if (!drag) return;
      if (rafId.id) return; // throttle with rAF
      rafId.id = requestAnimationFrame(()=>{
        rafId.id = null;
        const it = (items||[]).find(i=>i.id===drag.id);
        if (!it) return;
        let nextRect = { ...drag.startRect };
        const cell = mouseToCell(e);
        if (drag.mode === 'move' && drag.ids && drag.ids.length > 1) {
          const startCell = drag.startCell || { c: drag.startRect.x, r: drag.startRect.y };
          const dx = cell.c - startCell.c;
          const dy = cell.r - startCell.r;
          const rects = {};
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          drag.ids.forEach((id) => {
            const r0 = drag.startRects?.[id];
            if (!r0) return;
            minX = Math.min(minX, r0.x);
            minY = Math.min(minY, r0.y);
            maxX = Math.max(maxX, r0.x + r0.w);
            maxY = Math.max(maxY, r0.y + r0.h);
          });
          let adjDx = dx;
          let adjDy = dy;
          if (minX + adjDx < 0) adjDx = -minX;
          if (minY + adjDy < 0) adjDy = -minY;
          if (maxX + adjDx > cols) adjDx = cols - maxX;
          if (maxY + adjDy > rows) adjDy = rows - maxY;
          drag.ids.forEach((id) => {
            const r0 = drag.startRects?.[id];
            if (!r0) return;
            rects[id] = { ...r0, x: r0.x + adjDx, y: r0.y + adjDy };
          });
          if (canPlaceGroup(drag.ids, rects)) {
            drag.lastGood = { ...rects };
          }
          setLiveRects(rects);
          return;
        }
        if (drag.mode==='move'){
          const dx = cell.c - drag.startRect.x;
          const dy = cell.r - drag.startRect.y;
          nextRect = clampRect({ ...nextRect, x: drag.startRect.x + dx, y: drag.startRect.y + dy });
        } else {
          const newW = Math.max(1, cell.c - drag.startRect.x + 1);
          const newH = Math.max(1, cell.r - drag.startRect.y + 1);
          // apply per-type minimums
          const t = String(it.type||'').toLowerCase();
          const minW = 3;
          const minH = t==='line' ? 2 : 6;
          nextRect = clampRect({ ...nextRect, w: Math.max(minW, newW), h: Math.max(minH, newH) });
        }
        // Always show live preview. Commit rules:
        // - Moving: commit only if placement valid
        // - Resizing: allow shrinking even if overlapping (shrinking reduces collisions),
        //             allow expanding only if placement valid
        if (drag.mode==='resize'){
          const shrinkingW = nextRect.w <= drag.startRect.w;
          const shrinkingH = nextRect.h <= drag.startRect.h;
          if (shrinkingW || shrinkingH || canPlace(drag.id, nextRect)) {
            drag.lastGood = { ...nextRect };
          }
        } else {
          if (canPlace(drag.id, nextRect)) {
            drag.lastGood = { ...nextRect };
          }
        }
        // Directional bias for placement search (prefer below if cursor moved down)
        preferDownRef.current = cell.r >= drag.startRect.y;
        // save debug info
        debugInfoRef.current = {
          mode: drag.mode,
          start: drag.startRect,
          next: nextRect,
          lastGood: drag.lastGood,
          canPlace: canPlace(drag.id, nextRect),
        };
        // If user is at the bottom edge (clamped) while dragging, auto-grow immediately.
        // We cannot rely on overflow because clamp keeps y within rows, so detect edge contact.
        // Detect proximity to bottom and grow rows early to avoid clamp-induced jumps.
        const atBottomEdge = (nextRect.y + nextRect.h >= rows - 2) || (cell.r >= rows - 2);
        if (atBottomEdge && !growPendingRef.current){
          // Grow exactly as much as needed (min 12 rows)
          const needed = Math.max(12, (nextRect.y + nextRect.h + 2) - rows);
          try { onGrowRows?.(sectionId, needed); growPendingRef.current = true; } catch {}
        }
        // store for mouse-up logic
        nearBottomRef.current = atBottomEdge;
        setLiveRect({ id: drag.id, ...nextRect });
      });
    }
    function onUp(e){
      if (selecting && sel){
        const hits = (items||[]).filter(it=>{
          const r = { x: it.x||0, y: it.y||0, w: Math.max(1,it.w||1), h: Math.max(1,it.h||1) };
          return rectsOverlap(r, sel);
        });
        if (hits.length){
          setSelectedIds(hits.map(h=>h.id));
          setSelectedId(hits[0].id);
          setMenu(null);
          setSel(null);
        } else {
          const rect = rootRef.current?.getBoundingClientRect();
          if (canAdd) setMenu({ x: (e.clientX - (rect?.left || 0)), y: (e.clientY - (rect?.top || 0)) });
        }
      }
      setSelecting(false);
      setAnchor(null);
      if (drag){
        // Compute preferred target
        const cell = mouseToCell(e);
        if (drag.mode === 'move' && drag.ids && drag.ids.length > 1) {
          const rectMap = drag.lastGood || drag.startRects || {};
          const updated = (items||[]).map((x) => (rectMap[x.id] ? { ...x, ...rectMap[x.id] } : x));
          onChange?.(updated);
          setDrag(null);
          setDraggingId(null);
          setLiveRects(null);
          return;
        }
        const t = String((items.find(i=>i.id===drag.id)||{}).type||'').toLowerCase();
        const minW = 3; const minH = (t==='line') ? 2 : 6;

        // For resize, the new size must be honored. For move, we keep original size.
        let intended;
        if (drag.mode === 'resize'){
          // Use liveRect if available, otherwise derive from cursor vs startRect.
          const wFromMouse = Math.max(1, cell.c - drag.startRect.x + 1);
          const hFromMouse = Math.max(1, cell.r - drag.startRect.y + 1);
          const w = Math.max(minW, (liveRect && liveRect.id===drag.id) ? (liveRect.w||drag.startRect.w) : wFromMouse);
          const h = Math.max(minH, (liveRect && liveRect.id===drag.id) ? (liveRect.h||drag.startRect.h) : hFromMouse);
          intended = clampRect({ x: drag.startRect.x, y: drag.startRect.y, w, h });
        } else {
          intended = clampRect({ x: cell.c, y: cell.r, w: Math.max(minW, drag.startRect.w), h: Math.max(minH, drag.startRect.h) });
        }

        const tryFindFlexible = (base, rowsLimit=rows, colsLimit=cols) => {
          const yMaxSpan = 64; // deeper vertical search
          const xMaxSpan = Math.max(12, Math.floor(colsLimit/4));
          const downFirst = preferDownRef.current;
          const dxOrder = (limit) => { const arr=[0]; for(let i=1;i<=limit;i++){arr.push(i,-i);} return arr; };
          const dxs = dxOrder(xMaxSpan);
          for (let d=0; d<=yMaxSpan; d++){
            const ys = downFirst ? [base.y + d, base.y - d] : [base.y - d, base.y + d];
            for (const yCand of ys){
              const ny = Math.max(0, Math.min(rowsLimit - base.h, yCand));
              // exact x, keep width
              {
                const rect = clampRectTo({ x: Math.min(colsLimit-base.w, base.x), y: ny, w: base.w, h: base.h }, rowsLimit, colsLimit);
                if (canPlace(drag.id, rect)) return rect;
              }
              // spread horizontally, keep width
              for (const dx of dxs){
                const nx = Math.max(0, Math.min(colsLimit - base.w, base.x + dx));
                const rect = clampRectTo({ x: nx, y: ny, w: base.w, h: base.h }, rowsLimit, colsLimit);
                if (canPlace(drag.id, rect)) return rect;
              }
              // relax width if still blocked
              for (let w=base.w-1; w>=minW; w--){
                const rect = clampRectTo({ x: Math.min(colsLimit-w, base.x), y: ny, w, h: base.h }, rowsLimit, colsLimit);
                if (canPlace(drag.id, rect)) return rect;
                for (const dx of dxs){
                  const nx = Math.max(0, Math.min(colsLimit - w, base.x + dx));
                  const r2 = clampRectTo({ x: nx, y: ny, w, h: base.h }, rowsLimit, colsLimit);
                  if (canPlace(drag.id, r2)) return r2;
                }
              }
            }
          }
          return null;
        };

        let commitRect = null;

        if (drag.mode === 'resize'){
          // Allow shrinking even if overlapping during drag; on drop commit if valid,
          // otherwise fall back to the last valid rect captured during drag.
          const shrinkingW = intended.w <= drag.startRect.w;
          const shrinkingH = intended.h <= drag.startRect.h;
          if (shrinkingW || shrinkingH || canPlace(drag.id, intended)){
            commitRect = intended;
          } else if (drag.lastGood){
            commitRect = { ...drag.lastGood };
          } else {
            commitRect = drag.startRect;
          }
        } else {
          // Move: try intended → flexible search → virtual grow + flexible → fallback
          // 1) Intended spot
          if (canPlace(drag.id, intended)) commitRect = intended;
          // 2) Nearby search in current grid bounds
          if (!commitRect) commitRect = tryFindFlexible(intended, rows, cols);
          // 3) If still blocked and near bottom -> grow rows virtually and place now
          if (!commitRect && (intended.y + intended.h >= rows - 1 || nearBottomRef.current)) {
            const virtualRows = rows + Math.max(12, (intended.y + intended.h + 2) - rows);
            const virtual = tryFindFlexible(intended, virtualRows, cols);
            if (virtual) {
              const growBy = Math.max(12, (virtual.y + virtual.h + 2) - rows);
              try { onGrowRows?.(sectionId, growBy); } catch {}
              commitRect = virtual;
              showGrowRowsTip(`Added ${growBy} rows automatically and placed item.`);
            }
          }
          // 4) If still not found, revert to start and hint
          if (!commitRect) {
            showGrowRowsTip("No free slot here. Adjust neighbors or add rows.");
            commitRect = drag.startRect;
          }
        }

        const updated = (items||[]).map(i=> i.id===drag.id ? { ...i, ...commitRect } : i);
        onChange?.(updated);
      }
      setDrag(null);
      setDraggingId(null);
      setLiveRect(null);
      setLiveRects(null);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return ()=>{
      if (rafId.id) cancelAnimationFrame(rafId.id);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, items, cols, rows, rowHeight, onChange, selecting, anchor, sel]);

  // Inline editor for a selected item
  const editItem = (canEditProps && editMenu && (items||[]).find(i=>i.id===editMenu.itemId)) || null;

  // When opening a different item, seed the editor content once to avoid cursor jumps/RTL glitches.
  useEffect(() => {
    if (!editItem || !rteRef.current) return;
    if (lastEditIdRef.current !== editItem.id) {
      rteRef.current.innerHTML = sanitizeHtml(editItem.props?.html || editItem.props?.text || 'Text');
      lastEditIdRef.current = editItem.id;
    }
  }, [editItem]);

  function patchItem(p){
    if (!editItem) return;
    onChange?.((items||[]).map(i=> i.id===editItem.id ? { ...i, ...p } : i));
  }

  return (
    <div
      ref={rootRef}
      style={gridStyle}
      onMouseDown={onGridMouseDown}
      onMouseMove={(e)=>{ setCursorCell(mouseToCell(e)); onGridMouseMove(e); }}
      tabIndex={0}
      onKeyDown={(e)=>{
        if (!selectedIds.length) return;
        const delta = 1;
        const withBounds = (r, minW, minH)=>({ x: Math.max(0, Math.min(cols - r.w, r.x)), y: Math.max(0, Math.min(rows - r.h, r.y)), w: Math.max(minW, Math.min(cols - r.x, r.w)), h: Math.max(minH, Math.min(rows - r.y, r.h)) });

        // Toggle debug
        if (e.key === 'd' || e.key === 'D'){
          setDebug(v=>!v);
          e.preventDefault();
          return;
        }

        // Undo: Ctrl/Cmd + Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')){
          onUndo?.();
          e.preventDefault();
          return;
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z (Cmd on macOS)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key==='z' || e.key==='Z')))){
          onRedo?.();
          e.preventDefault();
          return;
        }

        // Move: Arrow keys without Shift (multi-select moves as a group)
        if (!e.shiftKey && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
          const dx = e.key==='ArrowLeft' ? -delta : e.key==='ArrowRight' ? delta : 0;
          const dy = e.key==='ArrowUp' ? -delta : e.key==='ArrowDown' ? delta : 0;
          const rects = {};
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          selectedIds.forEach((id) => {
            const it = (items||[]).find(x=>x.id===id);
            if (!it) return;
            const r0 = { x: it.x||0, y: it.y||0, w: Math.max(1,it.w||1), h: Math.max(1,it.h||1) };
            minX = Math.min(minX, r0.x);
            minY = Math.min(minY, r0.y);
            maxX = Math.max(maxX, r0.x + r0.w);
            maxY = Math.max(maxY, r0.y + r0.h);
          });
          let adjDx = dx;
          let adjDy = dy;
          if (minX + adjDx < 0) adjDx = -minX;
          if (minY + adjDy < 0) adjDy = -minY;
          if (maxX + adjDx > cols) adjDx = cols - maxX;
          if (maxY + adjDy > rows) adjDy = rows - maxY;
          selectedIds.forEach((id) => {
            const it = (items||[]).find(x=>x.id===id);
            if (!it) return;
            rects[id] = { x: (it.x||0) + adjDx, y: (it.y||0) + adjDy, w: Math.max(1,it.w||1), h: Math.max(1,it.h||1) };
          });
          if (canPlaceGroup(selectedIds, rects)) {
            const updated = (items||[]).map(x=> rects[x.id] ? { ...x, ...rects[x.id] } : x);
            onChange?.(updated);
            e.preventDefault();
          }
        }

        // Resize: Shift + Arrow (single selection only)
        if (e.shiftKey && selectedIds.length === 1 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
          const it = (items||[]).find(x=>x.id===selectedIds[0]);
          if (!it) return;
          const t = String(it.type||'').toLowerCase();
          const minW = 3;
          const minH = t==='line' ? 2 : 6;
          const next = {...it};
          if (e.key==='ArrowLeft') next.w = (it.w||1) - delta;
          if (e.key==='ArrowRight') next.w = (it.w||1) + delta;
          if (e.key==='ArrowUp') next.h = (it.h||1) - delta;
          if (e.key==='ArrowDown') next.h = (it.h||1) + delta;
          const bounded = withBounds(next, minW, minH);
          if (canPlace(it.id, bounded)){
            const updated = (items||[]).map(x=> x.id===it.id ? bounded : x);
            onChange?.(updated);
            e.preventDefault();
          }
        }
      }}
    >
      {cells.map((cell) => (
        <div key={`${cell.c}_${cell.r}`} style={cellStyle} />
      ))}

      {(items||[]).map((it)=>{
        const cur = (liveRects && liveRects[it.id]) ? liveRects[it.id] : ((liveRect && liveRect.id===it.id) ? liveRect : it);
        const invalidLive = (liveRect && liveRect.id===it.id) ? !canPlace(it.id, cur) : false;
        const isSelected = selectedIds.includes(it.id);
        const sItem={ gridColumn:`${(cur.x||0)+1} / span ${Math.max(1, cur.w||1)}`, gridRow:`${(cur.y||0)+1} / span ${Math.max(1, cur.h||1)}`, position:'relative', border: isSelected ? (invalidLive? '2px solid #ef4444' : '2px solid #2563eb') : '1px solid transparent', background:'transparent', overflow:'hidden', cursor:'move', opacity: draggingId===it.id?0.92:1, willChange:'transform', boxSizing:'border-box', padding:'2px', borderRadius:4 };
        const t = String(it.type||'').toLowerCase();
        const fieldMeta = t==='field' ? (fields||[]).find(f=> String(f.column||'').toLowerCase() === String(it.field||'').toLowerCase()) : null;
        return (
          <div key={it.id} style={sItem} onMouseDown={(e)=>startMove(e,it)} onClick={(e)=>{ e.stopPropagation(); if (e.shiftKey || e.ctrlKey || e.metaKey) { setSelectedIds((prev)=>{ const next = prev.includes(it.id)? prev.filter(x=>x!==it.id) : [...prev, it.id]; setSelectedId(next[0]||null); return next; }); } else { setSelectedIds([it.id]); setSelectedId(it.id); } rootRef.current?.focus(); }}>
            {canEditProps && (
              <div style={{position:'absolute', right:2, top:2, display:'flex', gap:4}}>
                <button onClick={(e)=>openEditor(e,it)} style={{fontSize:10}}>•••</button>
              </div>
            )}
            <div style={{position:'absolute', right:-2, bottom:-2, width:14, height:14, cursor:'nwse-resize', background:'#3b82f6', borderRadius:2}} onMouseDown={(e)=>startResize(e,it)} />
            {/* Inline content preview */}
            {t==='text' && (
              <div style={{
                padding:6,
                color: it.props?.color||'inherit',
                background: it.props?.backgroundColor || undefined,
                fontWeight: it.props?.fontWeight || undefined,
                fontStyle: it.props?.italic ? 'italic' : undefined,
                textDecoration: it.props?.underline ? 'underline' : undefined,
                textAlign: it.props?.textAlign || 'left',
                fontSize: it.props?.fontSize ? Number(it.props.fontSize) : undefined,
                whiteSpace:'pre-wrap'
              }}>
                {it.props?.text || 'Text'}
              </div>
            )}
            {t==='image' && (
              <div style={{padding:4}}>
                {it.props?.src ? (
                  <img alt={it.props?.alt||''} src={it.props?.src} style={{maxWidth:'100%', maxHeight: it.props?.maxHeight||64, objectFit:'contain'}} />
                ) : (
                  <div style={{fontSize:12, color:'#64748b'}}>No image</div>
                )}
              </div>
            )}
            {t==='line' && (
              <div style={{position:'absolute', left:4, right:4, top:'50%'}}>
                <div style={{height:Math.max(1, Number(it.props?.thickness||2)), background: it.props?.color||'#94a3b8'}} />
              </div>
            )}
            {t==='field' && (
              <div style={{padding:'6px'}}>
                {(() => {
                  const label = fieldMeta?.label || it.field || 'Field';
                  const fTypeRaw = String(fieldMeta?.input_type||fieldMeta?.type||'text').toLowerCase();
                  const fType = fTypeRaw === 'dropdownlist' ? 'select' : (fTypeRaw === 'integer' ? 'number' : fTypeRaw);
                  const opts = Array.isArray(fieldMeta?.option_list) && fieldMeta.option_list.length
                    ? fieldMeta.option_list.map(o=>({ value: String(o.value ?? o.id ?? ''), label: o.label ?? o.name ?? String(o.value ?? '') }))
                    : String(fieldMeta?.options||'').split(',').map(s=>s.trim()).filter(Boolean).map((lbl,i)=>({ value:String(i+1), label:lbl }));
                  if (fType === 'radio') {
                    const list = opts.length?opts:[{value:'A',label:'Option A'},{value:'B',label:'Option B'}];
                    return (
                      <>
                        <div style={{ fontSize:12, color:'#475569', marginBottom:4 }}>{label}</div>
                        <RadioGroup value={''}>
                          {list.map(o=> (
                            <FormControlLabel key={o.value} value={o.value} control={<MuiRadio size="small" disabled/>} label={o.label} />
                          ))}
                        </RadioGroup>
                      </>
                    );
                  }
                  if (fType === 'checkbox') {
                    const list = opts.length?opts:[{value:'A',label:'Option A'},{value:'B',label:'Option B'}];
                    return (
                      <>
                        <div style={{ fontSize:12, color:'#475569', marginBottom:4 }}>{label}</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-start' }}>
                          {list.map(o=> (
                            <FormControlLabel key={o.value} control={<MuiCheckbox size="small" disabled/>} label={o.label} />
                          ))}
                        </div>
                      </>
                    );
                  }
                  if (fType === 'select') {
                    const list = opts.length?opts:[{value:'1',label:'Option 1'},{value:'2',label:'Option 2'}];
                    return (
                      <MuiTextField size="small" fullWidth select disabled value="" label={label}>
                        <MenuItem value="">—</MenuItem>
                        {list.map(o=> (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </MuiTextField>
                    );
                  }
                  if (fType === 'date') {
                    return (
                      <MuiTextField size="small" fullWidth type="date" disabled label={label} InputLabelProps={{ shrink:true }} />
                    );
                  }
                  // default text/number with label inside the field
                  return (
                    <MuiTextField size="small" fullWidth disabled type={fType==='number'?'number':'text'} label={label} />
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}

      {selGridOverlay && <div style={selGridOverlay} />}

      {/* Minimal always-on grid reference */}
      {showCellRef && (
        <div style={{ position:'absolute', left:8, top:8, background:'rgba(17,17,17,.65)', color:'#fff', padding:'2px 6px', fontSize:10, borderRadius:3, zIndex:9998 }}>
          c:{cursorCell.c} r:{cursorCell.r}
        </div>
      )}

      {debug && (
        <div style={{ position:'absolute', left:8, top:8, background:'rgba(17,17,17,.85)', color:'#fff', padding:'6px 8px', fontSize:11, borderRadius:4, zIndex:9999 }}>
          <div>cell: c:{cursorCell.c} r:{cursorCell.r}</div>
          {drag && (
            <>
              <div>mode: {drag.mode}</div>
              <div>start: x{drag.startRect.x} y{drag.startRect.y} w{drag.startRect.w} h{drag.startRect.h}</div>
              {liveRect && (<div>next: x{liveRect.x} y{liveRect.y} w{liveRect.w} h{liveRect.h}</div>)}
              {debugInfoRef.current && (
                <div>commit? {String(debugInfoRef.current.canPlace || (drag.mode==='resize' && (liveRect?.w<=drag.startRect.w || liveRect?.h<=drag.startRect.h)))}</div>
              )}
            </>
          )}
        </div>
      )}

      {tip && (
        <div style={{ position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:18, background:'rgba(17,17,17,.85)', color:'#fff', padding:'8px 12px', fontSize:12, borderRadius:6, zIndex:99999, boxShadow:'0 4px 16px rgba(0,0,0,.25)' }}>
          {tip}
        </div>
      )}

      {canAdd && menu && sel && (
        <MuiPaper
          onMouseDown={(e)=>e.stopPropagation()}
          onClick={(e)=>e.stopPropagation()}
          elevation={6}
          sx={{
            position:'absolute',
            left: menu.x,
            top: menu.y,
            p: 1,
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,.18)'
          }}
        >
          <MuiStack direction="row" spacing={1} alignItems="center">
            <MuiButton size="small" variant="contained" onClick={(e)=>{ e.stopPropagation(); apply('image'); }} startIcon={<ImageIcon fontSize="small" />}>Image</MuiButton>
            <MuiButton size="small" variant="contained" onClick={(e)=>{ e.stopPropagation(); apply('text'); }} startIcon={<TextFieldsIcon fontSize="small" />}>Text</MuiButton>
            <MuiButton size="small" variant="contained" onClick={(e)=>{ e.stopPropagation(); apply('line'); }} startIcon={<HorizontalRuleIcon fontSize="small" />}>Line</MuiButton>
            {allowFields && (
              <>
                <MuiTextField select size="small" value={menuField} onChange={(e)=>setMenuField(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="">Select field…</MenuItem>
                  {fields.map((f) => (
                    <MenuItem key={f.column} value={f.column}>{f.label || f.column}</MenuItem>
                  ))}
                </MuiTextField>
                <MuiButton size="small" variant="outlined" disabled={!menuField} onClick={(e)=>{ e.stopPropagation(); applyField(); }}>Place</MuiButton>
              </>
            )}
            <MuiButton size="small" variant="text" onClick={(e)=>{ e.stopPropagation(); setSel(null); setMenu(null); }}>Cancel</MuiButton>
          </MuiStack>
        </MuiPaper>
      )}

      {editItem && (
        <MuiPaper
          onMouseDown={(e)=>e.stopPropagation()}
          onClick={(e)=>e.stopPropagation()}
          elevation={8}
          sx={{ position:'absolute', left: editMenu.x, top: editMenu.y, p:1.25, borderRadius:2, minWidth:320, zIndex:11 }}
        >
          <MuiStack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <MuiTypography variant="subtitle2">Edit {String(editItem.type||'text').toLowerCase()}</MuiTypography>
            <MuiIconButton size="small" onClick={(e)=>{ e.stopPropagation(); setEditMenu(null); }}><CloseIcon fontSize="small"/></MuiIconButton>
          </MuiStack>

          {String(editItem.type).toLowerCase()==='image' && (
            <MuiStack spacing={1}>
              <MuiTextField size="small" label="Image URL or data" value={editItem.props?.src||''} onChange={(e)=>patchItem({ props:{ ...(editItem.props||{}), src: e.target.value } })} />
              <MuiTextField size="small" label="Alt" value={editItem.props?.alt||''} onChange={(e)=>patchItem({ props:{ ...(editItem.props||{}), alt: e.target.value } })} />
              <MuiTextField size="small" type="number" label="Max height" value={editItem.props?.maxHeight||48} onChange={(e)=>patchItem({ props:{ ...(editItem.props||{}), maxHeight: Number(e.target.value||0) } })} />
              <MuiButton component="label" size="small" variant="outlined">Upload…
                <input hidden type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>patchItem({ props:{ ...(editItem.props||{}), src: fr.result } }); fr.readAsDataURL(f); }} />
              </MuiButton>
            </MuiStack>
          )}

          {String(editItem.type).toLowerCase()==='text' && (
            <MuiStack spacing={1}>
              {/* Live toolbar */}
              <MuiStack direction="row" spacing={1} alignItems="center">
                <MuiTooltip title="Bold"><MuiIconButton size="small" onClick={()=>{ rteRef.current?.focus(); document.execCommand('bold'); }}><FormatBoldIcon fontSize="small"/></MuiIconButton></MuiTooltip>
                <MuiTooltip title="Italic"><MuiIconButton size="small" onClick={()=>{ rteRef.current?.focus(); document.execCommand('italic'); }}><FormatItalicIcon fontSize="small"/></MuiIconButton></MuiTooltip>
                <MuiTooltip title="Underline"><MuiIconButton size="small" onClick={()=>{ rteRef.current?.focus(); document.execCommand('underline'); }}><FormatUnderlinedIcon fontSize="small"/></MuiIconButton></MuiTooltip>
                <MuiDivider flexItem orientation="vertical" sx={{ mx: .5 }} />
                <MuiTooltip title="Align left"><MuiIconButton size="small" onClick={()=>patchItem({ props:{ ...(editItem.props||{}), textAlign:'left' } })}><FormatAlignLeftIcon fontSize="small"/></MuiIconButton></MuiTooltip>
                <MuiTooltip title="Align center"><MuiIconButton size="small" onClick={()=>patchItem({ props:{ ...(editItem.props||{}), textAlign:'center' } })}><FormatAlignCenterIcon fontSize="small"/></MuiIconButton></MuiTooltip>
                <MuiTooltip title="Align right"><MuiIconButton size="small" onClick={()=>patchItem({ props:{ ...(editItem.props||{}), textAlign:'right' } })}><FormatAlignRightIcon fontSize="small"/></MuiIconButton></MuiTooltip>
              </MuiStack>
              <div
                ref={rteRef}
                contentEditable
              suppressContentEditableWarning
              dir="ltr"
              inputMode="text"
              autoCorrect="off"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onKeyDown={(e)=>{ e.stopPropagation(); }}
              onInput={(e)=>{
                const html = sanitizeHtml(e.currentTarget.innerHTML);
                patchItem({ props:{ ...(editItem.props||{}), html, text: e.currentTarget.innerText } });
              }}
              style={{
                minHeight:80,
                padding:'6px 8px',
                border:'1px solid rgba(0,0,0,0.2)',
                  borderRadius:6,
                  outline:'none',
                background:'#fff',
                whiteSpace:'pre-wrap',
                textAlign: editItem.props?.textAlign || 'left',
                fontSize: editItem.props?.fontSize ? Number(editItem.props.fontSize) : undefined,
                direction:'ltr',
                unicodeBidi:'plaintext'
              }}
            />
              <MuiDivider sx={{ my: 0.5 }} />
              {/* Move Size just below editor; remove lower B/align/underline/italic row */}
              <MuiStack direction="row" spacing={1} alignItems="center">
                <MuiTextField size="small" type="number" label="Size" sx={{ width:110 }} value={editItem.props?.fontSize||14} onChange={(e)=>patchItem({ props:{ ...(editItem.props||{}), fontSize: Number(e.target.value||0) } })} />
              </MuiStack>
              <MuiStack direction="row" spacing={1} alignItems="center">
                <MuiTextField size="small" label="Color" type="color" value={editItem.props?.color||'#111111'} onChange={(e)=>{ rteRef.current?.focus(); document.execCommand('foreColor', false, e.target.value); patchItem({ props:{ ...(editItem.props||{}), color: e.target.value } }); }} sx={{ width:180 }} />
                <MuiTextField size="small" label="Background" type="color" value={editItem.props?.backgroundColor||'#ffffff'} onChange={(e)=>{ rteRef.current?.focus(); document.execCommand('hiliteColor', false, e.target.value); patchItem({ props:{ ...(editItem.props||{}), backgroundColor: e.target.value } }); }} sx={{ width:200 }} />
              </MuiStack>
            </MuiStack>
          )}

          {String(editItem.type).toLowerCase()==='line' && (
            <MuiStack spacing={1}>
              <MuiTextField size="small" type="number" label="Thickness" value={editItem.props?.thickness||2} onChange={(e)=>patchItem({ props:{ ...(editItem.props||{}), thickness: Number(e.target.value||0) } })} />
              <MuiTextField size="small" label="Color" type="color" value={editItem.props?.color||'#cbd5e1'} onChange={(e)=>patchItem({ props:{ ...(editItem.props||{}), color: e.target.value } })} />
            </MuiStack>
          )}

          {canDelete && (
            <MuiStack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
              <MuiButton size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={()=>{ onChange?.((items||[]).filter(i=>i.id!==editItem.id)); setEditMenu(null); }}>
                Remove
              </MuiButton>
            </MuiStack>
          )}
        </MuiPaper>
      )}
    </div>
  );
}
