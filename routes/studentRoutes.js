// routes/studentRoutes.js
const express = require('express');
const multer = require('multer');
const { importExcel, getByClass, updatePhones } = require('../controllers/studentController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/import', upload.single('file'), importExcel);
router.get('/', getByClass);
router.post('/update-phones', updatePhones);

module.exports = router;
