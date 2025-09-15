const express = require('express');
const router = express.Router();
const weeklyScoresController = require('../controllers/classWeeklyScoreController');

// Lấy danh sách điểm theo tuần (?weekNumber=1)
router.get('/', weeklyScoresController.getWeeklyScores);

// Gom dữ liệu + tính điểm tuần rồi lưu vào DB
router.post('/calculate', weeklyScoresController.calculateWeeklyScores);

// Tính tổng điểm + xếp hạng theo khối
router.post('/calculate-total-rank', weeklyScoresController.calculateTotalRank);

// Lưu thủ công dữ liệu điểm tuần
router.post('/', weeklyScoresController.saveWeeklyScores);

module.exports = router;
