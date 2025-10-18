const express = require('express');
const router = express.Router();
const controller = require('../controllers/violationController');

// 🔎 Tìm kiếm & lấy danh sách
router.get('/search', controller.searchViolations);
router.get('/unhandled/students', controller.getUnhandledViolationStudents);
router.get('/all/all-student', controller.getAllViolationStudents);

// ➕ Ghi nhận & xử lý
router.post('/', controller.createViolation);
router.patch('/:id/handle', controller.handleViolation); // ✅ Cập nhật chuẩn xử lý

// ❌ Xóa & thống kê
router.delete('/:id', controller.deleteViolation);
router.get('/count', controller.getViolationCount);
router.get('/unhandled/count', controller.getUnhandledViolationCount);
router.get('/students/multiple-violations/count', controller.countMultipleViolations);



router.put('/:id', controller.updateViolation);

router.get("/gvcn-limit", controller.getGVCNHandlingLimit);
router.post("/gvcn-limit", controller.toggleGVCNHandlingLimit);

// 📌 Lấy vi phạm theo học sinh
router.get('/:name', controller.getViolationsByStudent);

module.exports = router;
