function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getAppBaseUrl() {
  return trimTrailingSlash(
    process.env.APP_BASE_URL ||
      process.env.CLIENT_ORIGIN ||
      "http://localhost:3000"
  );
}

function appUrl(path = "") {
  const base = getAppBaseUrl();
  const cleanPath = String(path || "");
  if (!cleanPath) return base;
  return `${base}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

module.exports = {
  getAppBaseUrl,
  appUrl,
};
