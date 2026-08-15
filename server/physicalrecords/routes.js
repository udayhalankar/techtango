const express = require("express");
const router = express.Router();
const svc = require("./service");


router.post("/search", async (req, res, next) => {
try { res.json(await svc.search(req.body)); } catch (e) { next(e); }
});


// router.post("/submit", async (req, res, next) => {
// // try { res.json(await svc.submit(req.body)); } catch (e) { next(e); }
// try { res.json(await svc.submit(req)); } catch (e) { next(e); }

// });

 router.post("/submit", async (req, res, next) => {
   try { res.json(await svc.submit(req)); } catch (e) { next(e); }
 });


router.get("/requests/:id", async (req, res, next) => {
try { res.json(await svc.getRequest(req.params.id)); } catch (e) { next(e); }
});


router.post("/requests/:id/service", async (req, res, next) => {
try { res.json(await svc.processService(req.params.id, req.body)); } catch (e) { next(e); }
});


router.post("/requests/:id/material", async (req, res, next) => {
try { res.json(await svc.processMaterial(req.params.id, req.body)); } catch (e) { next(e); }
});


router.post("/inward/boxes", async (req, res, next) => {
try { res.json(await svc.inwardBoxes(req.body)); } catch (e) { next(e); }
});


router.post("/inward/files", async (req, res, next) => {
try { res.json(await svc.inwardFiles(req.body)); } catch (e) { next(e); }
});


router.post("/register", async (req, res, next) => {
try { res.json(await svc.register(req.body)); } catch (e) { next(e); }
});


module.exports = router;