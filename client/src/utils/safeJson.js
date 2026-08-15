// utils/safeJson.js
export async function safeJson(res) {
  // No content
  if (res.status === 204) return null;

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // If it looks like JSON, parse normally
  if (ct.includes("application/json")) {
    return await res.json();
  }

  // Otherwise read as text and try a best-effort parse
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Bubble up a useful error that includes the first chunk of the body
    const snippet = text.length > 200 ? text.slice(0, 200) + "…" : text;
    throw new Error(`Expected JSON but got:\n${snippet}`);
  }
}
