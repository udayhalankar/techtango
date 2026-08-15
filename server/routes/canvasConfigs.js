//Routes/canvasConfig.js
const express = require('express');
const router = express.Router();
const {
  createCanvasConfig,
  updateCanvasConfig,
  getCanvasConfig,
  listCanvasConfigs,
  archiveCanvasConfig,
} = require('../controllers/canvasConfigs');

router.post('/', createCanvasConfig);
router.put('/:id', updateCanvasConfig);
router.get('/:id', getCanvasConfig);
router.get('/', listCanvasConfigs);
router.patch('/:id/archive', archiveCanvasConfig);

module.exports = router;

