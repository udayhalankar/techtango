// client/src/pages/businessautomation/simple_workflowbuilder/usersApi.js
import api from "../../../services/api";

// tenantId is required (you can pass it from /auth/me)
export async function fetchUsersForNotifications(tenantId) {
  const { data } = await api.get("/users"); // adjust if you have a tenant filter in backend
  const all = Array.isArray(data) ? data : (data?.users || []);

  // Filter by tenant in the client (or pass a server param if available)
  const filtered = tenantId ? all.filter(u => String(u.tenant_id) === String(tenantId)) : all;

  return filtered.map(u => ({
    value: String(u.id),                                  // IMPORTANT: id as string for selects
    label: `${u.firstname || ""} ${u.lastname || ""}`.trim() || u.email || `User #${u.id}`,
    email: u.email,
    id: u.id,
  }));
}
