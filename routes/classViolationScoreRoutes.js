const express = require('express');
const router = express.Router();
const classViolationScoreController = require('../controllers/classViolationScoreController');

router.post('/', classViolationScoreController.createOrUpdateClassViolationScore);
router.get('/:classId/:weekId', classViolationScoreController.getClassViolationScore);
router.get('/', classViolationScoreController.getByWeek);

module.exports = router;
