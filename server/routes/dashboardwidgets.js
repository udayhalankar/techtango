// server/routes/dashboardwidgets.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCache(key, data, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchText(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.text();
}

function parseRssItems(xml, limit = 5) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const chunk = match[1];
    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(chunk);
    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(chunk);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
    const link = linkMatch ? linkMatch[1].trim() : "";
    if (title) items.push({ title, link });
  }
  return items;
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/time", async (req, res) => {
  try {
    const tz = String(req.query.tz || "UTC");
    const key = `time:${tz}`;
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const data = await fetchJson(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(tz)}`);
    const payload = { timezone: data.timezone, datetime: data.datetime };
    setCache(key, payload, 60 * 1000);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/weather", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "lat/lon required" });
    }
    const key = `weather:${lat}:${lon}`;
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
      `&longitude=${lon}&current=temperature_2m,weather_code`;
    const data = await fetchJson(url);
    const payload = {
      temperature: data?.current?.temperature_2m ?? null,
      weatherCode: data?.current?.weather_code ?? null,
    };
    setCache(key, payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/rates", async (req, res) => {
  try {
    const base = String(req.query.base || "USD");
    const symbols = String(req.query.symbols || "EUR,GBP");
    const key = `rates:${base}:${symbols}`;
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const data = await fetchJson(
      `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols)}`
    );
    const payload = { base: data.base, rates: data.rates || {} };
    setCache(key, payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/news", async (req, res) => {
  try {
    const topic = String(req.query.topic || "financial");
    const key = `news:${topic}`;
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      topic
    )}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchText(rssUrl);
    const items = parseRssItems(xml, 6);
    const payload = { items };
    setCache(key, payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/sports", async (_req, res) => {
  try {
    const key = "sports";
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const xml = await fetchText("https://www.espn.com/espn/rss/news");
    const items = parseRssItems(xml, 6);
    const payload = { items };
    setCache(key, payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/bullion", async (_req, res) => {
  try {
    const key = "bullion";
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const data = await fetchJson("https://api.metals.live/v1/spot");
    const payload = { data };
    setCache(key, payload);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/ticker", async (req, res) => {
  try {
    const symbols = String(req.query.symbols || "");
    if (!symbols) return res.status(400).json({ error: "symbols required" });
    const key = `ticker:${symbols}`;
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const companyNames = symbols
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const quotes = await Promise.all(
      companyNames.map(async (companyName) => {
        const data = await fetchJson(
          `https://military-jobye-haiqstudios-14f59639.koyeb.app/nse/get_quote_info?companyName=${encodeURIComponent(
            companyName
          )}`
        );
        return { companyName, data };
      })
    );

    const payload = { quotes };
    setCache(key, payload, 60 * 1000);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
