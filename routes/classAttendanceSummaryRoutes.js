const express = require('express');
const router = express.Router();
const controller = require('../controllers/classAttendanceSummaryController');

router.get('/', controller.getByWeek);
router.post('/', controller.saveSummaries);
router.get('/by-week-and-class', controller.getByWeekAndClass);
module.exports = router;
