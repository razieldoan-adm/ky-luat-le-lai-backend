const express = require('express');
const router = express.Router();
const controller = require('../controllers/classLineUpSummaryController');

router.post('/', controller.createRecord);
router.get('/weekly-summary', controller.getWeeklySummary);
router.delete('/:id', controller.deleteRecord);
router.get('/', controller.getAllRecords);

// ✅ Tổng hợp điểm theo lớp
router.get("/summary-by-class", controller.getClassLineUpTotal);

// ✅ Ghi điểm vào ClassWeeklyScore
router.post("/update-weekly-lineup", controller.updateWeeklyLineUpScore);
module.exports = router;
