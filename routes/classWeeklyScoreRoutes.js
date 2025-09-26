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

//so sánh thay đổi
router.get('/check-changes/:weekNumber', classWeeklyScoreController.checkChanges);

module.exports = router;
