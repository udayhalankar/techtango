export const REVISION_LOG_KEY = "experience_builder_v2_revision_log_v1";

const safeRead = () => {
  try {
    const raw = localStorage.getItem(REVISION_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (entries) => {
  try {
    localStorage.setItem(REVISION_LOG_KEY, JSON.stringify(entries));
  } catch {
    // Ignore write failures in private/incognito or restricted storage modes.
  }
};

export function loadRevisionLog() {
  return safeRead();
}

export function clearRevisionLog() {
  safeWrite([]);
  return [];
}

export function appendRevisionLog(entry) {
  const next = [
    ...safeRead(),
    {
      id: entry?.id || `rev_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      timestamp: entry?.timestamp || new Date().toISOString(),
      action: entry?.action || "update",
      pageId: entry?.pageId || null,
      pageName: entry?.pageName || "",
      style: entry?.style || "",
      summary: entry?.summary || "",
      schemaVersion: entry?.schemaVersion || "v2.0",
      status: entry?.status || "ok",
      spec: entry?.spec || null,
      prompt: entry?.prompt || null,
      error: entry?.error || null,
    },
  ].slice(-100);

  safeWrite(next);
  return next;
}

export function summarizePageSpec(pageSpec) {
  const sectionCount = Array.isArray(pageSpec?.layout?.sections) ? pageSpec.layout.sections.length : 0;
  const widgetCount = Array.isArray(pageSpec?.widgets) ? pageSpec.widgets.length : 0;
  return {
    name: pageSpec?.pageMeta?.name || "Untitled",
    style: pageSpec?.pageMeta?.style || "modern",
    sectionCount,
    widgetCount,
  };
}

