const express = require('express');
const router = express.Router();
const {
  getWeeklyScores,
  getTempWeeklyScores,
  saveWeeklyScores,
  update,   // 👈 thêm mới
} = require('../controllers/classWeeklyScoreController');

router.get('/', getWeeklyScores);           // lấy dữ liệu đã lưu
router.get('/temp', getTempWeeklyScores);   // lấy dữ liệu thô
router.post('/', saveWeeklyScores);         // lưu dữ liệu lần đầu
router.put("/class-weekly-scores/update/:weekNumber", updateWeeklyScores);

module.exports = router;
