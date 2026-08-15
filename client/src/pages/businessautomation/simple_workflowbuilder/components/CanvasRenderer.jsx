// CanvasRenderer.jsx
import React from "react";
import { TextField as MuiTextField, Checkbox as MuiCheckbox, Radio as MuiRadio, RadioGroup, FormControlLabel, MenuItem } from '@mui/material';

/**
 * Read-only canvas renderer for a section with a CSS grid.
 * props:
 *  - section { id, grid: { cols, rowHeight }, items: [{id,type,x,y,w,h,props,field}] }
 *  - previewFields (optional, for field labels)
 */
export default function CanvasRenderer({ section, previewFields, showGrid = true, labelStyle = 'side' }) {
  if (!section || !section.grid) return null;
  const cols = Math.max(1, Number(section.grid.cols || 48));
  const rowH = Math.max(4, Number(section.grid.rowHeight || 8));

  const byName = Object.fromEntries(
    (previewFields || []).map((f) => [String(f.column || ""), f])
  );

  const cell = rowH; // use row height as grid cell size
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
    gridAutoRows: `${rowH}px`,
    gap: 2,
    position: "relative",
    padding: 6,
    ...(showGrid
      ? {
          backgroundImage:
            `linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px),` +
            `linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundColor: "#f8fafc",
        }
      : { background: "transparent" }),
  };

  const items = Array.isArray(section.items) ? section.items : [];

  return (
    <div style={gridStyle}>
      {items.map((it) => {
        const style = {
          gridColumn: `${Math.max(1, it.x + 1)} / span ${Math.max(1, it.w)}`,
          gridRow: `${Math.max(1, it.y + 1)} / span ${Math.max(1, it.h)}`,
          padding: 2,
        };
        const fieldSx = {
          "& .MuiOutlinedInput-root": { "& fieldset": { border: '1px solid #cbd5e1' } },
          "& .MuiInputBase-input": { padding: '6px 8px' },
          "& .MuiInputBase-root": { background: "transparent" },
        };

        const t = String(it.type || "").toLowerCase();
        if (t === "text") {
          const styleText = {
            textAlign: it.props?.textAlign || it.props?.align || 'left',
            color: it.props?.color || undefined,
            background: it.props?.backgroundColor || undefined,
            fontWeight: it.props?.fontWeight || undefined,
            fontStyle: it.props?.italic ? 'italic' : undefined,
            textDecoration: it.props?.underline ? 'underline' : undefined,
            fontSize: it.props?.fontSize ? Number(it.props.fontSize) : undefined,
            whiteSpace: 'pre-wrap',
          };
          return (
            <div key={it.id || Math.random()} style={style}>
              {it.props?.text ? (
                <div style={styleText}>{String(it.props.text)}</div>
              ) : (
                it.props?.html ? (
                  <div style={styleText} dangerouslySetInnerHTML={{ __html: it.props.html }} />
                ) : null
              )}
            </div>
          );
        }
        if (t === "image" && it.props?.src) {
          return (
            <div key={it.id || Math.random()} style={style}>
              <img
                src={it.props.src}
                alt={it.props.alt || ""}
                style={{ maxWidth: "100%", maxHeight: it.props.maxHeight || 64, objectFit: "contain" }}
              />
            </div>
          );
        }
        if (t === "line") {
          return (
            <div key={it.id || Math.random()} style={style}>
              <div style={{ height: Math.max(1, Number(it.props?.thickness || 2)), background: it.props?.color || "#cbd5e1" }} />
            </div>
          );
        }
        if (t === "field") {
          const meta = byName[it.field] || {};
          const label = meta.label || it.field;
          const fTypeRaw = String(meta.input_type||meta.type||'text').toLowerCase();
          const fType = fTypeRaw === 'dropdownlist' ? 'select' : (fTypeRaw === 'integer' ? 'number' : fTypeRaw);
          const opts = Array.isArray(meta.option_list) && meta.option_list.length
            ? meta.option_list.map(o=>({ value: String(o.value ?? o.id ?? ''), label: o.label ?? o.name ?? String(o.value ?? '') }))
            : String(meta.options||'').split(',').map(s=>s.trim()).filter(Boolean).map((lbl,i)=>({ value:String(i+1), label:lbl }));
          let control = null;
          if (fType === 'radio') {
            control = (
              <RadioGroup value={''}>
                {(opts.length?opts:[{value:'A',label:'Option A'},{value:'B',label:'Option B'}]).map(o=> (
                  <FormControlLabel key={o.value} value={o.value} control={<MuiRadio size="small" disabled/>} label={o.label} />
                ))}
              </RadioGroup>
            );
          } else if (fType === 'checkbox') {
            control = (
              <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-start' }}>
                {(opts.length?opts:[{value:'A',label:'Option A'},{value:'B',label:'Option B'}]).map(o=> (
                  <FormControlLabel key={o.value} control={<MuiCheckbox size="small" disabled/>} label={o.label} />
                ))}
              </div>
            );
          } else if (fType === 'select') {
            control = (
              <MuiTextField size="small" fullWidth select disabled value="" sx={fieldSx} variant="outlined">
                <MenuItem value="">—</MenuItem>
                {(opts.length?opts:[{value:'1',label:'Option 1'},{value:'2',label:'Option 2'}]).map(o=> (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </MuiTextField>
            );
          } else if (fType === 'date') {
            control = (
              <MuiTextField size="small" fullWidth type="date" disabled InputLabelProps={{ shrink:true }} sx={fieldSx} />
            );
          } else {
            control = (
              <MuiTextField size="small" fullWidth disabled type={fType==='number'?'number':'text'} sx={fieldSx} />
            );
          }

          if (labelStyle === 'side') {
            return (
              <div key={it.id || Math.random()} style={style}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize: 12, color: '#475569' }}>{label}</div>
                  <div>{control}</div>
                </div>
              </div>
            );
          }
          // top labels
          return (
            <div key={it.id || Math.random()} style={style}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>{label}</div>
              {control}
            </div>
          );
        }
        return <div key={it.id || Math.random()} style={style} />;
      })}
    </div>
  );
}
