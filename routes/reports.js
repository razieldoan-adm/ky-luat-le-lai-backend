const express = require('express');
const router = express.Router();
const { getWeeklyReport } = require('../controllers/reportsController');

router.get('/week', getWeeklyReport);

module.exports = router;
