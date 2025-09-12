const express = require('express');
const router = express.Router();
const weeklyScoresController = require('../controllers/classWeeklyScoreController');

router.get('/', weeklyScoresController.getWeeklyScores);
router.post('/', weeklyScoresController.saveWeeklyScores);
router.post('/calculate', weeklyScoresController.calculateWeeklyScores);
router.post('/calculate-total-rank', weeklyScoresController.calculateTotalRank);

module.exports = router;
