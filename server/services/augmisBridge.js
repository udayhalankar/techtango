// B4 Pass 2: issue short-lived, purpose-scoped Ed25519 proofs.
// Never sign user-provided schema, role, tenant ID or published status.
"use strict";
const crypto = require("crypto");
const fs = require("fs");

const ISSUER = "techtango.aiappbuilder";
const AUDIENCE = "augmis.control-plane.b4";
const VERIFY = "techtango.tenant.verify.v1";
const STAGE = "techtango.app.stage.v1";
const SLUG = /^[a-z][a-z0-9_]{0,63}$/;
const APP_SLUG = /^[a-z0-9][a-z0-9_]{0,63}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = new Set(["admin", "tenant_admin", "superadmin", "super_admin"]);

function validateTarget(body) {
  const linkId = body?.linkId;
  const augmisTenantId = body?.augmisTenantId;
  if (typeof linkId !== "string" || !UUID.test(linkId)
      || typeof augmisTenantId !== "string" || !UUID.test(augmisTenantId)) {
    throw new TypeError("Valid linkId and augmisTenantId are required");
  }
  return { linkId: linkId.toLowerCase(), augmisTenantId: augmisTenantId.toLowerCase() };
}

// Require a *database-verified* active tenant admin, not a JWT role claim.
async function requireSourceTenantAdmin(pool, req) {
  const actorId = Number(req?.user?.id);
  const sourceTenantId = Number(req?.user?.tenant_id);
  if (!Number.isSafeInteger(actorId) || actorId < 1
      || !Number.isSafeInteger(sourceTenantId) || sourceTenantId < 1) {
    return null;
  }
  const { rows } = await pool.query(
    `SELECT id, tenant_id, role FROM users
      WHERE id = $1 AND tenant_id = $2 AND is_active IS TRUE LIMIT 1`,
    [actorId, sourceTenantId]
  );
  const row = rows[0];
  if (!row || !ADMIN_ROLES.has(String(row.role || "").trim().toLowerCase())) {
    return null;
  }
  return { actorId, sourceTenantId };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validatedSnapshot(app, tenantId) {
  if (String(app?.status || "").toLowerCase() !== "published"
      || Number(app?.tenant_id) !== tenantId) {
    throw new TypeError("Published source-tenant application is required");
  }
  const appSlug = app.app_slug;
  const appName = app.app_name;
  if (typeof appSlug !== "string" || !APP_SLUG.test(appSlug)
      || typeof appName !== "string" || appName.trim().length < 1 || appName.trim().length > 200) {
    throw new TypeError("Invalid application identity");
  }
  const schema = app.schema_json;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new TypeError("Missing object schema_json");
  }
  const fields = schema.fields === undefined ? [] : schema.fields;
  if (!Array.isArray(fields) || fields.length > 128) {
    throw new TypeError("Invalid field catalogue");
  }
  const safeFields = fields.map(field => {
    if (!field || typeof field !== "object" || Array.isArray(field)
        || typeof field.name !== "string" || !SLUG.test(field.name)) {
      throw new TypeError("Invalid field identifier");
    }
    return {
      name: field.name,
      type: String(field.type === undefined ? "text" : field.type).slice(0, 30),
      label: String(field.label === undefined ? field.name : field.label).slice(0, 100),
    };
  });
  const output = {
    format: "augmis.techtango.aiappbuilder.snapshot.v1",
    sourceTenantId: tenantId,
    appSlug,
    appName: appName.trim(),
    fields: safeFields,
  };
  output.sha256 = crypto.createHash("sha256").update(stableJson(output), "utf8").digest("hex");
  return output;
}

function signProof(purpose, scope, extra = {}) {
  if (purpose !== VERIFY && purpose !== STAGE) throw new TypeError("Invalid proof purpose");
  const path = process.env.AUGMIS_BRIDGE_SIGNING_KEY_FILE;
  if (!path) throw new Error("AUGMIS_BRIDGE_SIGNING_KEY_FILE must be configured");
  // A file is required instead of placing the signing key in app source or logs.
  const privateKey = crypto.createPrivateKey(fs.readFileSync(path));
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("Expected Ed25519 private key");
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: ISSUER, aud: AUDIENCE, iat: now, nbf: now, exp: now + 120,
    jti: crypto.randomBytes(24).toString("base64url"), purpose,
    linkId: scope.linkId, augmisTenantId: scope.augmisTenantId,
    sourceTenantId: scope.sourceTenantId, actorId: scope.actorId,
    ...extra,
  };
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = encode({ alg: "EdDSA", typ: "JWT" });
  const payload = encode(claims);
  const message = `${head}.${payload}`;
  const signature = crypto.sign(null, Buffer.from(message), privateKey).toString("base64url");
  return `${message}.${signature}`;
}

module.exports = { VERIFY, STAGE, validateTarget, requireSourceTenantAdmin, validatedSnapshot, signProof };
