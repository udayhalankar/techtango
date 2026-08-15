// server/rmteam/validators.js

exports.parseSearch = (body = {}) => {
  const page = Number(body.page || 1);
  const pageSize = Math.min(100, Number(body.pageSize || 10));
  const sortBy = String(body.sortBy || 'date_created'); // name | role | active | date_created
  const sortDir = String(body.sortDir || 'desc');

  return {
    text: body.text ? String(body.text) : "",
    role: body.role ? String(body.role) : undefined,
    active: body.active === undefined ? undefined : (String(body.active).toLowerCase() === "true"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10,
    sortBy,
    sortDir,
  };
};

exports.parseCreate = (body = {}) => ({
  name: String(body.name || ""),
  role: String(body.role || ""),
  createdBy: body.createdBy ?? null,
  modifiedBy: body.modifiedBy ?? null,
  active: body.active === undefined ? true : !!body.active,
  mobile: body.mobile ?? null,
  email: body.email ?? null,
});

exports.parsePatch = (body = {}) => {
  const out = {};
  ["name","role","active","mobile","email","modifiedBy"].forEach(k => {
    if (body[k] !== undefined) out[k] = body[k];
  });
  return out;
};
