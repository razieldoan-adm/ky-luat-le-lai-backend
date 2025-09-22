// routes/studentRoutes.js
const express = require('express');
const multer = require('multer');
const { importExcel, getByClass, updatePhones } = require('../controllers/studentController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Import Excel
router.post('/import', upload.single('file'), importExcel);

// Lấy danh sách học sinh theo lớp
router.get('/', getByClass);

// Cập nhật số điện thoại cha mẹ
router.put('/update-phones', updatePhones);

module.exports = router;
