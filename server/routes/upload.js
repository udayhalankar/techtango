const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });
 
router.post( 
  '/', 
  verifyToken, 
  upload.any(),        // accepts multiple or single
  uploadController.smartUpload // <-- new controller below
);

router.post('/:tableName', verifyToken, upload.single('file'), uploadController.handleUpload);


module.exports = router;