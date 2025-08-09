const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const storage = multer.memoryStorage();
const upload = multer({ storage });
 

router.post('/:tableName', upload.single('file'), uploadController.handleUpload);


module.exports = router;