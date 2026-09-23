const express = require('express');
const router = express.Router();
const classViolationScoreController = require('../controllers/classViolationScoreController');

router.post('/', classViolationScoreController.createOrUpdateClassViolationScore);

// API tính điểm vi phạm theo tuần
router.get('/calculate', classViolationScoreController.calculateClassViolationScores);

router.get('/:classId/:weekId', classViolationScoreController.getClassViolationScore);
router.get('/', classViolationScoreController.getByWeek);

module.exports = router;
