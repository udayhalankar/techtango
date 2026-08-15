const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(process.env.REACT_APP_API_URL || "/api");
export const APP_BASE_URL = trimTrailingSlash(
  process.env.REACT_APP_APP_URL || window.location.origin || ""
);

export const apiUrl = (path) => {
  const cleanPath = String(path || "");
  if (!cleanPath) return API_BASE_URL;
  return `${API_BASE_URL}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
};

export const appUrl = (path) => {
  const cleanPath = String(path || "");
  if (!cleanPath) return APP_BASE_URL;
  return `${APP_BASE_URL}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
};
