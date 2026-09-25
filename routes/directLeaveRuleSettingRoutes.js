const express = require('express');

const router = express.Router();

const controller = require('../controllers/directLeaveRuleSettingController');

const {
  verifyToken,
  isAdmin,
} = require('../middlewares/authMiddleware');


// Lấy cấu hình
router.get(
  '/',
  verifyToken,
  controller.getSetting
);


// Admin lưu cấu hình
router.put(
  '/',
  verifyToken,
  isAdmin,
  controller.updateSetting
);


module.exports = router;
