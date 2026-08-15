export const authHeaders = () => {
  const raw =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? "");
  const t = raw ? decodeURIComponent(raw) : "";
  const h = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  h["X-Last-Activity"] = String(Date.now());
  return h;
};
