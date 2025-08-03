const express = require('express');
const router = express.Router();

// Dummy data or DB fetch
router.get('/', (req, res) => {
  res.json([
    { id: 1, name: 'Standard Approval Flow' },
    { id: 2, name: 'Fast Track Workflow' }
  ]);
});

module.exports = router;
