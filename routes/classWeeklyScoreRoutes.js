const express = require('express');
const router = express.Router();
const { getWeeklyScores } = require('../controllers/classWeeklyScoreController');

router.get('/week/:weekNumber', getWeeklyScores);

module.exports = router;
