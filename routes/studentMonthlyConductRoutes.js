const express = require("express");

const router = express.Router();

const controller =
  require("../controllers/studentMonthlyConductController");

const {
  verifyToken,
  isAdmin,
} = require("../middlewares/authMiddleware");

// =====================================================
// LẤY HẠNH KIỂM THÁNG
// =====================================================

router.get(
  "/",
  verifyToken,
  controller.getMonthlyConduct
);

// =====================================================
// DUYỆT HẠNH KIỂM THÁNG CHO 1 LỚP
// =====================================================

router.post(
  "/finalize",
  verifyToken,
  isAdmin,
  controller.finalizeMonth
);

module.exports = router;
