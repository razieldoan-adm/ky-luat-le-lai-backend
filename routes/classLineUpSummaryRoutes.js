const express = require('express');
const router = express.Router();
const controller = require('../controllers/classLineUpSummaryController');

router.post('/', controller.createRecord);
router.get('/weekly-summary', controller.getWeeklySummary);
router.delete('/:id', controller.deleteRecord);

module.exports = router;
