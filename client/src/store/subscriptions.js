// src/store/subscriptions.js
import { useEffect, useState } from "react";
import api from "../services/api";

export function useSubscribedModuleIds() {
  const [ids, setIds] = useState(null);     // null=loading
  const [list, setList] = useState([]);     // full records: [{module_id, module_name, status}, ...]
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/subscription/subscriptions");
        const rows = Array.isArray(res.data) ? res.data : [];
        const normalizedIds = rows
          .map((r) => Number(r.module_id))
          .filter((n) => Number.isFinite(n));
        if (!mounted) return;
        setList(rows);
        setIds(normalizedIds);
        // keep localStorage as a passive cache if you like
        localStorage.setItem("subscriptions", JSON.stringify(rows));
      } catch (e) {
        if (mounted) setErr(e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { ids, list, loading: ids === null, err };
}
