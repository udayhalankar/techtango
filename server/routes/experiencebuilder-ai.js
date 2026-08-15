const express = require("express");

const router = express.Router();

const ALLOWED_TOP_LEVEL_KEYS = ["schemaVersion", "pageMeta", "theme", "shell", "layout", "widgets", "behaviors", "generation"];
const PAGE_SPEC_SCHEMA_VERSION = "v2.0";
const ALLOWED_PAGE_STYLE = ["modern", "business", "professional", "it", "minimal", "dashboard", "landing", "editorial"];

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isHtmlMode = (value) => ["html", "stage1", "preview-html"].includes(String(value || "").toLowerCase().trim());

function serializeError(error) {
  if (!error) return null;
  const cause = error.cause && typeof error.cause === "object" ? error.cause : null;
  return {
    name: error.name || "Error",
    message: error.message || "Unknown error",
    code: error.code || null,
    errno: typeof error.errno === "number" ? error.errno : null,
    syscall: error.syscall || null,
    address: error.address || null,
    port: typeof error.port === "number" ? error.port : null,
    cause: cause
      ? {
          name: cause.name || "Error",
          message: cause.message || "Unknown cause",
          code: cause.code || null,
          errno: typeof cause.errno === "number" ? cause.errno : null,
          syscall: cause.syscall || null,
          address: cause.address || null,
          port: typeof cause.port === "number" ? cause.port : null,
        }
      : null,
  };
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateGeneratedPageSpec(pageSpec) {
  ensure(isPlainObject(pageSpec), "pageSpec must be an object");
  const topUnknown = Object.keys(pageSpec).filter((key) => !ALLOWED_TOP_LEVEL_KEYS.includes(key));
  ensure(topUnknown.length === 0, `pageSpec contains unsupported keys: ${topUnknown.join(", ")}`);
  ensure(pageSpec.schemaVersion === PAGE_SPEC_SCHEMA_VERSION, `schemaVersion must be ${PAGE_SPEC_SCHEMA_VERSION}`);
  ensure(isPlainObject(pageSpec.pageMeta), "pageMeta must be an object");
  ensure(typeof pageSpec.pageMeta.name === "string" && pageSpec.pageMeta.name.trim(), "pageMeta.name is required");
  ensure(ALLOWED_PAGE_STYLE.includes(pageSpec.pageMeta.style), "pageMeta.style is invalid");
  ensure(isPlainObject(pageSpec.layout), "layout must be an object");
  ensure(Array.isArray(pageSpec.layout.sections) && pageSpec.layout.sections.length > 0, "layout.sections is required");
  ensure(Array.isArray(pageSpec.widgets), "widgets must be an array");
  ensure(isPlainObject(pageSpec.generation), "generation must be an object");
  ensure(typeof pageSpec.generation.createdAt === "string", "generation.createdAt is required");
  ensure(typeof pageSpec.generation.revisionId === "string" && pageSpec.generation.revisionId.trim(), "generation.revisionId is required");
  const sectionIds = new Set(pageSpec.layout.sections.map((section) => section?.id).filter(Boolean));
  pageSpec.layout.sections.forEach((section, index) => {
    ensure(isPlainObject(section), `layout.sections[${index}] must be an object`);
    ensure(typeof section.id === "string" && section.id.trim(), `layout.sections[${index}].id is required`);
    ensure(Array.isArray(section.widgetIds), `layout.sections[${index}].widgetIds is required`);
  });
  pageSpec.widgets.forEach((widget, index) => {
    ensure(isPlainObject(widget), `widgets[${index}] must be an object`);
    ensure(typeof widget.id === "string" && widget.id.trim(), `widgets[${index}].id is required`);
    ensure(typeof widget.sectionId === "string" && sectionIds.has(widget.sectionId), `widgets[${index}].sectionId must map to a layout section`);
  });
  return pageSpec;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = [];
  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "string") {
      chunks.push(node);
      return;
    }
    if (node.type === "refusal") {
      throw new Error(node.refusal || "Model refused the request");
    }
    if (node.type === "output_text" && typeof node.text === "string") {
      chunks.push(node.text);
      return;
    }
    if (node.type === "message" && Array.isArray(node.content)) {
      node.content.forEach(visit);
      return;
    }
    if (typeof node.text === "string" && node.type !== "input_text") {
      chunks.push(node.text);
    }
  };

  visit(payload?.output || []);
  return chunks.join("").trim();
}

function sanitizeHtmlPreview(htmlText) {
  const text = String(htmlText || "").trim();
  if (!text) return text;
  return text
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOpenAiResponse(requestBody, controller, stageLabel) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null);
      return { response, payload };
    } catch (error) {
      lastError = error;
      const transient = /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(error?.message || "");
      if (!transient || attempt === maxAttempts || controller.signal.aborted) {
        throw Object.assign(new Error(`${stageLabel}: ${error?.message || "OpenAI request failed"}`), {
          cause: error,
        });
      }
      await wait(400 * attempt);
    }
  }

  throw Object.assign(new Error(`${stageLabel}: ${lastError?.message || "OpenAI request failed"}`), {
    cause: lastError,
  });
}

router.post("/generate", async (req, res) => {
  const { prompt, systemPrompt, schema, model, designerInput, generationMode } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }
  if (!isHtmlMode(generationMode) && !schema) {
    return res.status(400).json({ error: "prompt and schema are required" });
  }
  if (!isHtmlMode(generationMode) && !isPlainObject(schema)) {
    return res.status(400).json({ error: "schema must be an object" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  const timeoutSeconds = Math.max(5, Number(process.env.AI_REQUEST_TIMEOUT_SECONDS || 180));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  const openAiModel = model || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const openAiTemperature = Number(process.env.OPENAI_TEMPERATURE || 0.8);
  const trimmedSystemPrompt = String(systemPrompt || "").trim();

  try {
    const requestBody = {
      model: openAiModel,
      temperature: Number.isFinite(openAiTemperature) ? openAiTemperature : 0.8,
      input: [
        ...(trimmedSystemPrompt
          ? [
              {
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: trimmedSystemPrompt,
                  },
                ],
              },
            ]
          : []),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
    };

    if (!isHtmlMode(generationMode)) {
      requestBody.text = {
        format: {
          type: "json_schema",
          name: "experience_builder_page_spec",
          strict: true,
          schema,
        },
      };
    }

    const stageLabel = isHtmlMode(generationMode) ? "Stage 1 HTML preview" : "Stage 2 JSON conversion";
    const { response, payload } = await fetchOpenAiResponse(requestBody, controller, stageLabel);
    if (!response.ok) {
      return res.status(response.status).json({
        error: `${stageLabel} failed: ${payload?.error?.message || "OpenAI request failed"}`,
        details: {
          stage: stageLabel,
          status: response.status,
          statusText: response.statusText,
          openaiError: payload?.error || null,
          response: payload || null,
        },
      });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return res.status(502).json({ error: "OpenAI response did not include any output text" });
    }

    if (isHtmlMode(generationMode)) {
      return res.json({
        htmlPreview: sanitizeHtmlPreview(outputText),
        generationMode: "html",
        designerInput: designerInput || null,
        model: openAiModel,
      });
    }

    let pageSpec;
    try {
      pageSpec = JSON.parse(outputText);
    } catch (parseError) {
      return res.status(502).json({
        error: "OpenAI returned invalid JSON",
        details: parseError.message,
        raw: outputText,
      });
    }

    validateGeneratedPageSpec(pageSpec);

    return res.json({
      pageSpec,
      designerInput: designerInput || null,
      model: openAiModel,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({
        error: "AI generation timed out",
        details: { stage: isHtmlMode(generationMode) ? "Stage 1 HTML preview" : "Stage 2 JSON conversion" },
      });
    }
    return res.status(500).json({
      error: error.message || "AI generation failed",
      details: serializeError(error),
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

module.exports = router;
