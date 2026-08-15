const TOKEN_KEY = "token";
const LAST_ACTIVITY_KEY = "lastActivity";
const SUBSCRIPTIONS_KEY = "subscriptions";
export const DEFAULT_INACTIVITY_MINUTES = 15;

function getWindowObject() {
  if (typeof window === "undefined") {
    return null;
  }
  return window;
}

function safeLocalStorageRead(key) {
  const win = getWindowObject();
  if (!win) return null;
  try {
    return win.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageWrite(key, value) {
  const win = getWindowObject();
  if (!win) return;
  try {
    win.localStorage.setItem(key, value);
  } catch (_) {
    // Ignore storage failures so session handling never throws in the UI.
  }
}

function safeLocalStorageRemove(key) {
  const win = getWindowObject();
  if (!win) return;
  try {
    win.localStorage.removeItem(key);
  } catch (_) {
    // Ignore storage failures during logout.
  }
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(payload);
  } catch (_) {
    return null;
  }
}

export function getAuthToken() {
  return safeLocalStorageRead(TOKEN_KEY);
}

export function getLastActivityTimestamp() {
  const raw = safeLocalStorageRead(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function markSessionActivity() {
  safeLocalStorageWrite(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function isTokenExpired(token = getAuthToken()) {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}

export function isSessionExpired({
  token = getAuthToken(),
  inactivityMinutes = DEFAULT_INACTIVITY_MINUTES,
} = {}) {
  if (!token || isTokenExpired(token)) {
    return true;
  }

  const lastActivity = getLastActivityTimestamp();
  if (!Number.isFinite(lastActivity) || lastActivity <= 0) {
    return true;
  }

  const maxIdleMs = Math.max(1, inactivityMinutes) * 60 * 1000;
  return Date.now() - lastActivity > maxIdleMs;
}

export function clearSession() {
  safeLocalStorageRemove(TOKEN_KEY);
  safeLocalStorageRemove(LAST_ACTIVITY_KEY);
  safeLocalStorageRemove(SUBSCRIPTIONS_KEY);
}

export function redirectToLogin() {
  const win = getWindowObject();
  if (!win) return;

  if (win.location.pathname !== "/login") {
    win.location.replace("/login");
  }
}

export function endSession(options = {}) {
  const { navigate } = options;
  clearSession();

  if (typeof navigate === "function") {
    navigate("/login", { replace: true });
    return;
  }

  redirectToLogin();
}

export function handleAuthError(error, options = {}) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) {
    endSession(options);
  }
  return Promise.reject(error);
}
