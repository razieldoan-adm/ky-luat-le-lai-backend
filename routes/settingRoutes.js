const express = require('express');
const router = express.Router();
const setting = require('../controllers/settingController');

router.get('/', setting.getSettings);
router.put('/', setting.updateSettings);
router.put("/update", setting.updateSetting);

module.exports = router;
