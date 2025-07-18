const express = require('express');
const router = express.Router();
const controller = require('../controllers/settingTimeController');

router.get('/', controller.getSettingTime);
router.post('/update', controller.updateSettingTime);

module.exports = router;
