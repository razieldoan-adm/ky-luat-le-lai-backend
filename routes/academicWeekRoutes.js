const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicWeeksController');

router.post('/generate', controller.generateWeeks);
router.get('/', controller.getWeeks);
router.put('/bulk', controller.updateWeeksBulk);
router.delete('/', controller.deleteAllWeeks);
router.get('/study-weeks', controller.getStudyWeeks);
router.get('/current', controller.getCurrentStudyWeek);
module.exports = router;
