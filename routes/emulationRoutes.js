// routes/emulationRoutes.js

const express = require('express');
const router = express.Router();
const emulationController = require('../controllers/emulationController');

router.get('/weekscores/top-continuous', emulationController.getTopRankedClassesContinuous);
router.get('/weekscores/bottom-continuous', emulationController.getBottomRankedClassesContinuous);
router.get('/weekscores/top1-current-week', emulationController.getTop1EachGradeCurrentWeek);
module.exports = router;
