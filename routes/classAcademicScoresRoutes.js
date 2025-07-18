// routes/classAcademicScore.js
const express = require('express');
const router = express.Router();
const classAcademicScoreController = require('../controllers/classAcademicScoreController');

router.get('/', classAcademicScoreController.getClassAcademicScoresByWeek); // lấy theo tuần
router.post('/', classAcademicScoreController.saveClassAcademicScores);
router.put('/', classAcademicScoreController.updateClassAcademicScores);

module.exports = router;
