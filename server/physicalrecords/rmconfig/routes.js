// server/physicalrecords/rmconfig/routes.js
const express = require("express");
const router = express.Router();
const svc = require("./service");
const v = require("./validators");

// Per-request context
function ctx(req) {
  const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
  return { user: req.user, ip };
}

// LIST (GET)
router.get("/:res", async (req, res, next) => {
  try {
    const { user } = ctx(req);
    const params = v.parseList(req.query || {});
    const out = await svc.list(req.params.res, params, user); // no sudo
    res.json(out);
  } catch (e) { next(e); }
});

// Optional LIST (POST /search)
router.post("/:res/search", async (req, res, next) => {
  try {
    const { user } = ctx(req);
    const params = v.parseList(req.body || {});
    const out = await svc.list(req.params.res, params, user);
    res.json(out);
  } catch (e) { next(e); }
});

// CREATE
router.post("/:res", async (req, res, next) => {
  try {
    const { user, ip } = ctx(req);
    const body = v.pickCreateBody(req.params.res, req.body || {}, user);
    const out = await svc.create(req.params.res, body, user, ip);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

// GET ONE
router.get("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id);
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const out = await svc.get(req.params.res, key, req.user);
    if (!out) return res.status(404).json({ ok:false, error:"Not found" });
    res.json(out);
  } catch (e) { next(e); }
});

// PATCH
router.patch("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id);
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const { user, ip } = ctx(req);
    const body = v.pickPatchBody(req.params.res, req.body || {}, user);
    const out = await svc.patch(req.params.res, key, body, user, ip);
    res.json(out || { ok:false, error:"Not found" });
  } catch (e) { next(e); }
});

// DELETE
router.delete("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id);
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const { user, ip } = ctx(req);
    const out = await svc.remove(req.params.res, key, user, ip);
    res.json(out);
  } catch (e) { next(e); }
});

module.exports = router;



// // server/rmconfig/routes.js
// const express = require("express");
// const router = express.Router();
// const svc = require("./service");
// const v = require("./validators");
// const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
// const sudoAll = !!(req.user?.isSuperAdmin && req.get("X-All-Tenants") === "1");


// // List
// router.post("/:res/search", async (req, res, next) => {
//   try {
//     const { res: resName } = req.params;
//     const p = v.parseList(req.body || {});
//     const out = await svc.list(resName, p);
//     res.json(out);
//   } catch (e) { next(e); }
// });

// // Create
// router.post("/:res", async (req, res, next) => {
//   try {
//     const resName = req.params.res;
//     const body = v.pickCreateBody(resName, req.body || {}, req.user);
//     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
//     // const out = await svc.create(resName, body, req.user, ip);
//     const out = await svc.create(req.params.res, body, req.user, ip, { sudoAll });
//     res.json(out);
//   } catch (e) { next(e); }
// });

// // Get one
// // router.get("/:res/:id", async (req, res, next) => {
// //   try {
// //     const id = v.parseId(req.params.id);
// //     if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
// //     const out = await svc.get(req.params.res, id);
// //     res.json(out);
// //   } catch (e) { next(e); }
// // });

// // router.get("/:res/:id", async (req, res, next) => {
// //   try {
// //     const key = v.parseKeyParam(req.params.res, req.params.id);
// //     if (!key) return res.status(400).json({ ok: false, error: "Invalid id" });
// //     const out = await svc.get(req.params.res, key);   // <-- pass key object
// //     res.json(out);
// //   } catch (e) { next(e); }
// // });
// router.patch("/:res/:id", async (req, res, next) => {
//   try {
//     const key = v.parseKeyParam(req.params.res, req.params.id);
//     if (!key) return res.status(400).json({ ok: false, error: "Invalid id" });
//     const body = v.pickPatchBody(req.params.res, req.body || {}, req.user);
//     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
//     //const out = await svc.patch(req.params.res, key, body, req.user, ip); // <-- key object
//     const out = await svc.patch(req.params.res, key, body, req.user, ip, { sudoAll });
//     res.json(out);
//   } catch (e) { next(e); }
// });

// // Patch
// router.patch("/:res/:id", async (req, res, next) => {
//   try {
//     const id = v.parseId(req.params.id);
//     if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
//     const body = v.pickPatchBody(req.params.res, req.body || {}, req.user);
//     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
//     //const out = await svc.patch(req.params.res, id, body, req.user, ip);
//     const out = await svc.remove(req.params.res, key, req.user, ip, { sudoAll });
//     res.json(out);
//   } catch (e) { next(e); }
// });

// // Delete
// // router.delete("/:res/:id", async (req, res, next) => {
// //   try {
// //     const id = v.parseId(req.params.id);
// //     if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
// //     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
// //     const out = await svc.remove(req.params.res, id, req.user, ip);
// //     res.json(out);
// //   } catch (e) { next(e); }
// // });
// router.delete("/:res/:id", async (req, res, next) => {
//   try {
//     const key = v.parseKeyParam(req.params.res, req.params.id);
//     if (!key) return res.status(400).json({ ok: false, error: "Invalid id" });
//     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
//     //const out = await svc.remove(req.params.res, key, req.user, ip);      // <-- key object
//     const out = await svc.list(req.params.res, params, req.user, { sudoAll });
//     res.json(out);
//   } catch (e) { next(e); }
// });

// module.exports = router;


