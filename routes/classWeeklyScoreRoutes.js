const express = require('express');
const router = express.Router();
const {
  getWeeklyScores,
  getTempWeeklyScores,
  saveWeeklyScores,
} = require('../controllers/classWeeklyScoreController');

router.get('/', getWeeklyScores);          // lấy dữ liệu đã lưu
router.get('/temp', getTempWeeklyScores);  // lấy dữ liệu thô
router.post('/', saveWeeklyScores);        // lưu dữ liệu

module.exports = router;
