const express = require('express');
const router = express.Router();
const controller = require('../controllers/classWeeklyScoreController');

// Save mới
router.post('/', controller.saveScore);

// Update lại
router.put('/:id', controller.updateScore);

module.exports = router;
