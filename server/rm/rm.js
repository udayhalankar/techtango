// server/rm/rm.js
const express = require("express");
const router = express.Router();
const svc = require("../physicalrecords/rmconfig/service");
const v   = require("../physicalrecords/rmconfig/validators");

// (optional) quick probe to confirm we have tenant in session
// router.use((req, _res, next) => { console.log("[rm] whoami", req.user); next(); });

function clientIp(req) {
  return (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
}

// LIST (GET ?text=&page=&pageSize=&sortBy=&sortDir=)
router.get("/:res", async (req, res, next) => {
  try {
    const params = v.parseList(req.query || {});
    const out = await svc.list(req.params.res, params, req.user); // <-- pass user
    res.json(out);
  } catch (e) { next(e); }
});

// LIST (POST /search)
router.post("/:res/search", async (req, res, next) => {
  try {
    const params = v.parseList(req.body || {});
    const out = await svc.list(req.params.res, params, req.user); // <-- pass user
    res.json(out);
  } catch (e) { next(e); }
});

// CREATE
router.post("/:res", async (req, res, next) => {
  try {
    const body = v.pickCreateBody(req.params.res, req.body || {}, req.user);
    const out = await svc.create(req.params.res, body, req.user, clientIp(req));
    res.status(201).json(out); // 201 for create
  } catch (e) { next(e); }
});

// GET ONE (supports composite ids like "5,108")
router.get("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id); // <-- key object
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const out = await svc.get(req.params.res, key, req.user);   // <-- pass user
    if (!out) return res.status(404).json({ ok:false, error:"Not found" });
    res.json(out);
  } catch (e) { next(e); }
});

// PATCH (update)
router.patch("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id); // <-- key object
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const body = v.pickPatchBody(req.params.res, req.body || {}, req.user);
    const out  = await svc.patch(req.params.res, key, body, req.user, clientIp(req)); // <-- pass user
    if (!out) return res.status(404).json({ ok:false, error:"Not found" });
    res.json(out);
  } catch (e) { next(e); }
});

// PUT (alias to PATCH)
router.put("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id);
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const body = v.pickPatchBody(req.params.res, req.body || {}, req.user);
    const out  = await svc.patch(req.params.res, key, body, req.user, clientIp(req));
    if (!out) return res.status(404).json({ ok:false, error:"Not found" });
    res.json(out);
  } catch (e) { next(e); }
});

// DELETE
router.delete("/:res/:id", async (req, res, next) => {
  try {
    const key = v.parseKeyParam(req.params.res, req.params.id); // <-- key object
    if (!key) return res.status(400).json({ ok:false, error:"Invalid id" });
    const out = await svc.remove(req.params.res, key, req.user, clientIp(req)); // <-- pass user
    res.json(out);
  } catch (e) { next(e); }
});

module.exports = router;











// // server/rm/rm.js
// const express = require("express");
// const router = express.Router();
// const svc = require("../physicalrecords/rmconfig/service");
// const v = require("../physicalrecords/rmconfig/validators");


// // List (GET with querystring)
// router.get("/:res", async (req, res, next) => {
//   try {
//     const { res: resName } = req.params;
//     const p = v.parseList(req.query || {});
//     const out = await svc.list(resName, p);
//     res.json(out);
//   } catch (e) { next(e); }
// });

// router.put("/:res/:id", async (req, res, next) => {
//   try {
//     const idObj = v.parseKeyParam(req.params.res, req.params.id);
//     if (!idObj) return res.status(400).json({ ok:false, error:"Invalid id" });
//     const body = v.pickPatchBody(req.params.res, req.body || {}, req.user);
//     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
//     const out = await svc.patch(req.params.res, idObj, body, req.user, ip);
//     res.json(out);
//   } catch (e) { next(e); }
// });

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
//     const out = await svc.create(resName, body, req.user, ip);
//     res.json(out);
//   } catch (e) { next(e); }
// });

// // Get one
// router.get("/:res/:id", async (req, res, next) => {
//   try {
//     const id = v.parseId(req.params.id);
//     if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
//     const out = await svc.get(req.params.res, id);
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
//     const out = await svc.patch(req.params.res, id, body, req.user, ip);
//     res.json(out);
//   } catch (e) { next(e); }
// });

// // Delete
// router.delete("/:res/:id", async (req, res, next) => {
//   try {
//     const id = v.parseId(req.params.id);
//     if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
//     const ip = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;
//     const out = await svc.remove(req.params.res, id, req.user, ip);
//     res.json(out);
//   } catch (e) { next(e); }
// });

// module.exports = router;


// // // server/routes/rm.js
// // const express = require("express");
// // const router = express.Router();

// // // Example in-memory list; replace with DB calls
// // const table = { "retention-policies": [] };

// // router.get("/:resource", async (req, res) => {
// //   const { resource } = req.params;
// //   const q = (req.query.q || "").toLowerCase();
// //   const rows = (table[resource] || []).filter(r =>
// //     !q || JSON.stringify(r).toLowerCase().includes(q)
// //   );
// //   res.type("application/json").status(200).json(rows);
// // });

// // router.post("/:resource", async (req, res) => {
// //   const { resource } = req.params;
// //   const row = { id: Date.now(), ...req.body };
// //   table[resource] = table[resource] || [];
// //   table[resource].push(row);
// //   res.type("application/json").status(201).json(row);
// // });

// // router.put("/:resource/:id", async (req, res) => {
// //   const { resource, id } = req.params;
// //   const rows = table[resource] || [];
// //   const i = rows.findIndex(r => String(r.id) === String(id));
// //   if (i === -1) return res.status(404).json({ ok: false, error: "Not found" });
// //   rows[i] = { ...rows[i], ...req.body };
// //   res.type("application/json").status(200).json(rows[i]);
// // });

// // router.delete("/:resource/:id", async (req, res) => {
// //   const { resource, id } = req.params;
// //   const rows = table[resource] || [];
// //   const i = rows.findIndex(r => String(r.id) === String(id));
// //   if (i === -1) return res.status(404).json({ ok: false, error: "Not found" });
// //   rows.splice(i, 1);
// //   res.status(204).end(); // no JSON body on purpose
// // });

// // module.exports = router;
