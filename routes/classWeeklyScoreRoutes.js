const express = require('express');
const router = express.Router();
const classWeeklyScoreController = require('../controllers/classWeeklyScoreController');

// GET dữ liệu tuần đã lưu
router.get('/', classWeeklyScoreController.getWeeklyScores);

// GET dữ liệu tạm (tính từ các bảng khác)
router.get('/temp', classWeeklyScoreController.getTempWeeklyScores);

// POST cập nhật lại toàn bộ điểm tuần
router.post('/update/:weekNumber', classWeeklyScoreController.updateWeeklyScores);

// POST lưu dữ liệu tuần
router.post('/save', classWeeklyScoreController.saveWeeklyScores);

// GET so sánh thay đổi
router.get('/check-changes/:weekNumber', classWeeklyScoreController.checkChanges);

// 📌 Bổ sung mới

// Lấy danh sách tuần đã có dữ liệu
router.get('/weeks', classWeeklyScoreController.getWeeksWithScores);

// Xoá dữ liệu 1 tuần
router.delete('/:weekNumber', classWeeklyScoreController.deleteWeeklyScores);

// Xuất Excel
router.get('/export/:weekNumber', classWeeklyScoreController.exportWeeklyScores);

module.exports = router;
