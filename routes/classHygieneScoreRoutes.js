const express = require('express');
const router = express.Router();
const controller = require('../controllers/classHygieneScoreController');

router.get('/', controller.getClassHygieneScoresByWeek); // controller.getClassHygieneScoresByWeek undefined
router.post('/', controller.saveClassHygieneScores);
router.get('/by-week-and-class', controller.getByWeekAndClass);
module.exports = router;
