import React, { useEffect, useMemo, useState } from "react";

/**
 * DbSchemaExplorer
 * - Select schema (default: public)
 * - Pick a table from /api/db/tables
 * - Fetch column metadata from /api/db/columns
 * - Render a CREATE TABLE DDL you can copy-paste
 * - Optional preview using /api/db/preview
 */
export default function DbSchemaExplorer() {
  const [schema, setSchema] = useState("public");
  const [tables, setTables] = useState([]);
  const [table, setTable] = useState("");
  const [loadingTables, setLoadingTables] = useState(false);

  const [cols, setCols] = useState([]);
  const [loadingCols, setLoadingCols] = useState(false);

  const [previewRows, setPreviewRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [limit, setLimit] = useState(20);
  const [err, setErr] = useState("");

  // ---------- helpers ----------
  const toStrLower = (v) => String(v ?? "").toLowerCase();
  const yesNo = (v) => {
    if (v === true) return "yes";
    if (v === false) return "no";
    return toStrLower(v);
  };

  // Render a portable-ish type from PG metadata
  const renderType = (c) => {
    const dt = toStrLower(c.data_type);
    const udt = toStrLower(c.udt_name);
    const len = c.character_maximum_length;
    const prec = c.numeric_precision;
    const scale = c.numeric_scale;

    // varchar/char
    if (dt === "character varying" || dt === "varchar") {
      return len ? `varchar(${len})` : "varchar";
    }
    if (dt === "character" || dt === "char") {
      return len ? `char(${len})` : "char";
    }

    // numeric/decimal
    if (dt === "numeric" || dt === "decimal") {
      if (prec && scale != null) return `numeric(${prec},${scale})`;
      if (prec) return `numeric(${prec})`;
      return "numeric";
    }

    // timestamps/time/date
    if (dt.includes("timestamp")) return "timestamp";
    if (dt === "date") return "date";
    if (dt === "time") return "time";

    // booleans
    if (dt === "boolean") return "boolean";

    // JSON
    if (dt === "jsonb") return "jsonb";
    if (dt === "json") return "json";

    // UUID
    if (udt === "uuid") return "uuid";

    // integer families (based on udt_name)
    if (["int2", "int4", "int8", "serial", "bigserial"].includes(udt)) {
      if (udt === "int2") return "smallint";
      if (udt === "int4") return "integer";
      if (udt === "int8") return "bigint";
      if (udt === "serial") return "serial";
      if (udt === "bigserial") return "bigserial";
    }

    // floats
    if (dt === "real") return "real";
    if (dt === "double precision") return "double precision";

    // bytea
    if (dt === "bytea") return "bytea";

    // text
    if (dt === "text") return "text";

    // user-defined (enums/domains)
    if (dt === "user-defined" && udt) return udt;

    // fallback to whatever we have
    return dt || udt || "text";
  };

  // ---------- effects ----------
  // Load tables when schema changes
  useEffect(() => {
    (async () => {
      setLoadingTables(true);
      setErr("");
      try {
        const resp = await fetch(`/api/db/tables?schema=${encodeURIComponent(schema)}`);
        if (!resp.ok) throw new Error(`Tables fetch failed (${resp.status})`);
        const json = await resp.json();
        const list = Array.isArray(json) ? json : [];
        setTables(list);
        // keep current table if still present, else clear
        setTable((t) => (list.includes(t) ? t : ""));
      } catch (e) {
        setErr(e.message);
        setTables([]);
        setTable("");
      } finally {
        setLoadingTables(false);
      }
    })();
  }, [schema]);

  // Load columns when table changes
  useEffect(() => {
    if (!table) {
      setCols([]);
      setPreviewRows([]);
      return;
    }
    (async () => {
      setLoadingCols(true);
      setErr("");
      try {
        const resp = await fetch(
          `/api/db/columns?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}`
        );
        if (!resp.ok) throw new Error(`Columns fetch failed (${resp.status})`);
        const json = await resp.json();
        setCols(Array.isArray(json) ? json : []);
      } catch (e) {
        setErr(e.message);
        setCols([]);
      } finally {
        setLoadingCols(false);
      }
    })();
  }, [schema, table]);

  // ---------- PK guess ----------
  const guessPk = useMemo(() => {
    // heuristic: generated/nextval() → PK; else literal "id"
    const auto = cols.find((c) => toStrLower(c.column_default).includes("nextval("));
    if (auto) return auto.column_name;
    const identity = cols.find((c) => toStrLower(c.column_default).includes("generated"));
    if (identity) return identity.column_name;
    const idCol = cols.find((c) => c.column_name === "id");
    return idCol?.column_name || "";
  }, [cols]);

  // ---------- SQL generation ----------
  const createTableSql = useMemo(() => {
    if (!table || cols.length === 0) return "";

    const lines = cols.map((c) => {
      const type = renderType(c);
      const nullable = yesNo(c.is_nullable) === "yes";

      // Keep default as-is (stringify to be safe)
      const defStr = String(c.column_default ?? "").trim();
      const def = defStr ? ` DEFAULT ${defStr}` : "";

      return `  "${c.column_name}" ${type}${nullable ? "" : " NOT NULL"}${def}`;
    });

    const pkLine = guessPk ? `,\n  PRIMARY KEY ("${guessPk}")` : "";
    return `CREATE TABLE "${schema}"."${table}" (\n${lines.join(",\n")}${pkLine}\n);`;
  }, [schema, table, cols, guessPk]);

  const colListCsv = useMemo(() => cols.map((c) => c.column_name).join(","), [cols]);

  // ---------- preview ----------
  const loadPreview = async () => {
    if (!table || !cols.length) return;
    setLoadingPreview(true);
    setErr("");
    try {
      const resp = await fetch(
        `/api/db/preview?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(
          table
        )}&columns=${encodeURIComponent(colListCsv)}&limit=${encodeURIComponent(limit)}`
      );
      if (!resp.ok) throw new Error(`Preview failed (${resp.status})`);
      const json = await resp.json();
      if (!Array.isArray(json)) throw new Error("Preview is not an array");
      setPreviewRows(json);
    } catch (e) {
      setErr(e.message);
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // ---------- clipboard ----------
  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
      alert("Copied!");
    } catch {
      // fallback
      window.prompt("Copy the SQL below:", txt);
    }
  };

  // ---------- UI ----------
  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>DB Schema Explorer</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "end" }}>
        <label>
          <div style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>Schema</div>
          <input
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            placeholder="public"
            style={{ width: "100%" }}
          />
        </label>

        <label>
          <div style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>Table</div>
          <select value={table} onChange={(e) => setTable(e.target.value)} style={{ width: "100%" }}>
            <option value="">{loadingTables ? "Loading…" : "— Select table —"}</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => {
            /* noop – change on select loads columns */
          }}
          disabled={!table}
          style={{ height: 36 }}
          title="Columns auto-load when table changes"
        >
          Columns ✓
        </button>
      </div>

      {!!err && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: 8,
            borderRadius: 6,
            color: "#991b1b",
          }}
        >
          {String(err)}
        </div>
      )}

      {/* Columns grid */}
      {table && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
            Columns {loadingCols ? "…loading" : ""}
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Name", "Type", "Nullable", "Default"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 8,
                        borderBottom: "1px solid #e2e8f0",
                        fontSize: 12,
                        color: "#475569",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cols.map((c) => (
                  <tr key={c.column_name}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                      <code>{c.column_name}</code>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                      <code>{renderType(c)}</code>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                      {yesNo(c.is_nullable) === "yes" ? "YES" : "NO"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                      <code>{String(c.column_default ?? "")}</code>
                    </td>
                  </tr>
                ))}
                {cols.length === 0 && !loadingCols && (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "#64748b" }}>
                      No columns
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TABLE DDL */}
      {createTableSql && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div style={{ fontWeight: 600 }}>CREATE TABLE DDL</div>
            <button onClick={() => copy(createTableSql)}>Copy</button>
          </div>
          <textarea
            value={createTableSql}
            readOnly
            rows={Math.min(20, 4 + cols.length)}
            style={{
              width: "100%",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          />
        </div>
      )}

      {/* Preview */}
      {table && cols.length > 0 && (
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>Preview</div>
            <input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{ width: 80 }}
              title="Limit"
            />
            <button onClick={loadPreview} disabled={loadingPreview}>
              {loadingPreview ? "Loading…" : "Load"}
            </button>
          </div>

          <div style={{ overflow: "auto", maxHeight: 300, border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {cols.map((c) => (
                    <th
                      key={c.column_name}
                      style={{
                        textAlign: "left",
                        padding: 8,
                        borderBottom: "1px solid #e2e8f0",
                        fontSize: 12,
                        color: "#475569",
                      }}
                    >
                      {c.column_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {cols.map((c) => (
                      <td
                        key={c.column_name}
                        style={{ padding: 8, borderBottom: "1px solid #f1f5f9", fontSize: 12 }}
                      >
                        {String(row[c.column_name] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {previewRows.length === 0 && (
                  <tr>
                    <td colSpan={cols.length} style={{ padding: 12, color: "#64748b" }}>
                      No preview rows loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
