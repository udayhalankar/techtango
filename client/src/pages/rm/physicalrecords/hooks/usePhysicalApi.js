import { useCallback } from "react";


const base = "/api/physicalrecords";


export function usePhysicalApi() {
const j = useCallback(async (path, options) => {
const r = await fetch(base + path, { headers: { "Content-Type": "application/json" }, ...options });
if (!r.ok) throw new Error(await r.text());
return r.status === 204 ? null : r.json();
}, []);


return {
search: (q) => j(`/search`, { method: "POST", body: JSON.stringify(q) }),
submitRequests: (payload) => j(`/submit`, { method: "POST", body: JSON.stringify(payload) }),
getRequest: (id) => j(`/requests/${id}`),
processService: (id, body) => j(`/requests/${id}/service`, { method: "POST", body: JSON.stringify(body) }),
processMaterial: (id, body) => j(`/requests/${id}/material`, { method: "POST", body: JSON.stringify(body) }),
inwardBoxes: (body) => j(`/inward/boxes`, { method: "POST", body: JSON.stringify(body) }),
inwardFiles: (body) => j(`/inward/files`, { method: "POST", body: JSON.stringify(body) }),
registerNew: (body) => j(`/register`, { method: "POST", body: JSON.stringify(body) }),
};
}