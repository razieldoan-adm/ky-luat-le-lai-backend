const express = require('express');
const router = express.Router();
const {
  getWeeklyScores,
  getTempWeeklyScores,
  saveWeeklyScores,
  updateWeeklyScores,   // 👈 thêm mới
} = require('../controllers/classWeeklyScoreController');

router.get('/', getWeeklyScores);           // lấy dữ liệu đã lưu
router.get('/temp', getTempWeeklyScores);   // lấy dữ liệu thô
router.post('/', saveWeeklyScores);         // lưu dữ liệu lần đầu
router.put('/:weekNumber', updateWeeklyScores); // cập nhật dữ liệu tuần

module.exports = router;
