const router = require('express').Router();
const ctrl = require('../controllers/tasks');

router.post('/:taskId/complete', ctrl.completeTaskAndAdvance);
router.get('/inbox',  ctrl.getInbox);           // tasks assigned to me
router.get('/outbox', ctrl.getOutbox);          // instances I started (+ current status)
router.get('/:taskId', ctrl.getTaskById);       // fetch one task (to render the form)
router.post('/:taskId/save-draft', ctrl.saveDraft);
router.post('/:taskId/submit',     ctrl.submitTask); // completes + routes

module.exports = router;
