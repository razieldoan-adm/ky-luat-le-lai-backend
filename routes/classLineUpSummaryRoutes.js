const express = require('express');
const router = express.Router();
const classLineUpSummaryController = require('../controllers/classLineUpSummaryController');

router.get('/', classLineUpSummaryController.getByWeek);
router.post('/', classLineUpSummaryController.saveSummaries);
router.get('/by-week-and-class', classLineUpSummaryController.getByWeekAndClass);
module.exports = router;
