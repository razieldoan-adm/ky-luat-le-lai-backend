const express = require('express');
const router = express.Router();
const controller = require('../controllers/classLineUpSummaryController');

// Ghi nhận lỗi
router.post('/', controller.recordViolation);

// Lấy danh sách (lọc theo ngày hoặc tuần)
router.get('/', controller.getViolations);

// Xóa ghi nhận
router.delete('/:id', controller.deleteViolation);

module.exports = router;
