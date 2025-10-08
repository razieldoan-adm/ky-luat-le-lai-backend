const express = require('express');
const router = express.Router();
const controller = require('../controllers/classLineUpSummaryController');

router.post('/', controller.recordViolation);
router.get('/', controller.getViolations);
router.delete('/:id', controller.deleteViolation);
router.get('/weekly-summary', controller.getWeeklyScores);

module.exports = router; // ✅ dòng này là bắt buộc
