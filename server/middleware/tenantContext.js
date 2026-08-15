const pool = require("../db");

const TENANT_SETTING_KEY = "app.tenant_id";
const USER_SETTING_KEY = "app.current_user_id";
const ADMIN_SETTING_KEY = "app.is_admin";
const ROLE_SETTING_KEY = "app.current_role";

const ADMIN_ROLES = new Set([
  "admin",
  "superadmin",
  "super_admin",
  "tenant_admin",
]);

function toFiniteInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function resolveUserId(req) {
  const user = req?.user || {};
  return toFiniteInteger(
    firstDefined(
      user.id,
      user.userId,
      user.sub,
      user.uid,
      req.headers["x-user-id"]
    )
  );
}

function resolveTenantId(req) {
  const user = req?.user || {};
  return toFiniteInteger(
    firstDefined(
      user.tenant_id,
      user.tenantId,
      user.tenantid,
      user.tid,
      user.tenant,
      req.headers["x-tenant-id"],
      req.headers["x-tenant_id"]
    )
  );
}

function resolveRole(req) {
  const user = req?.user || {};
  const role = firstDefined(
    user.role,
    user.userRole,
    Array.isArray(user.roles) ? user.roles[0] : null,
    req.headers["x-user-role"]
  );
  return role ? String(role).toLowerCase() : "";
}

function resolveIsAdmin(req) {
  const role = resolveRole(req);
  return ADMIN_ROLES.has(role);
}

function buildTenantContext(req) {
  const userId = resolveUserId(req);
  const tenantId = resolveTenantId(req);
  const role = resolveRole(req);
  const isAdmin = resolveIsAdmin(req);

  return {
    userId,
    tenantId,
    role,
    isAdmin,
    hasTenant: Number.isFinite(tenantId),
    hasUser: Number.isFinite(userId),
  };
}

async function applyTenantSession(client, context) {
  const tenantValue = context?.tenantId !== null && context?.tenantId !== undefined
    ? String(context.tenantId)
    : "";
  const userValue = context?.userId !== null && context?.userId !== undefined
    ? String(context.userId)
    : "";
  const adminValue = context?.isAdmin ? "true" : "false";
  const roleValue = context?.role || "";

  await client.query(`SELECT set_config($1, $2::text, true)`, [TENANT_SETTING_KEY, tenantValue]);
  await client.query(`SELECT set_config($1, $2::text, true)`, [USER_SETTING_KEY, userValue]);
  await client.query(`SELECT set_config($1, $2::text, true)`, [ADMIN_SETTING_KEY, adminValue]);
  await client.query(`SELECT set_config($1, $2::text, true)`, [ROLE_SETTING_KEY, roleValue]);
}

async function runTenantScopedQuery(querySource, sql, params = [], context = {}) {
  const client = await querySource.connect();
  let released = false;

  const releaseClient = async () => {
    if (released) return;
    released = true;
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // Ignore rollback errors during cleanup.
    } finally {
      client.release();
    }
  };

  try {
    await client.query("BEGIN");
    await applyTenantSession(client, context);
    const result = await client.query(sql, params);
    await client.query("COMMIT");
    released = true;
    client.release();
    return result;
  } catch (error) {
    await releaseClient();
    throw error;
  }
}

function tenantContext(options = {}) {
  const { requireTenant = true, allowAdminBypass = true } = options;

  return function tenantContextMiddleware(req, res, next) {
    const context = buildTenantContext(req);
    const isAdmin = allowAdminBypass && context.isAdmin;
    const hasTenant = context.hasTenant;

    if (requireTenant && !isAdmin && !hasTenant) {
      return res.status(403).json({
        error: "Tenant context is required",
      });
    }

    req.tenantContext = context;
    req.tenantId = context.tenantId;
    req.isTenantScoped = hasTenant;
    req.isAdmin = context.isAdmin;
    req.tenantQuery = (sql, params = []) => runTenantScopedQuery(pool, sql, params, context);

    res.locals.tenantContext = context;
    res.locals.tenantId = context.tenantId;
    res.locals.isAdmin = context.isAdmin;

    return next();
  };
}

module.exports = {
  ADMIN_SETTING_KEY,
  ROLE_SETTING_KEY,
  TENANT_SETTING_KEY,
  USER_SETTING_KEY,
  applyTenantSession,
  buildTenantContext,
  resolveIsAdmin,
  resolveRole,
  resolveTenantId,
  resolveUserId,
  runTenantScopedQuery,
  tenantContext,
};
