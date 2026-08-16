const express = require("express");

const router =
  express.Router();

const controller =
  require("../controllers/studentMonthlyConductController");

// =====================================================
// LẤY HẠNH KIỂM THÁNG
// =====================================================

router.get(
  "/",
  controller.getMonthlyConduct
);

// =====================================================
// CHỐT HẠNH KIỂM THÁNG
// =====================================================

router.post(
  "/finalize",
  controller.finalizeMonth
);

module.exports = router;
