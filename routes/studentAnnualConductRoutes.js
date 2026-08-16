const express = require("express");

const router =
  express.Router();

const controller =
  require("../controllers/studentAnnualConductController");

// =====================================================
// LẤY HẠNH KIỂM CẢ NĂM
// =====================================================

router.get(
  "/",
  controller.getAnnualConduct
);

// =====================================================
// CHỐT CẢ NĂM
// =====================================================

router.post(
  "/finalize",
  controller.finalizeAnnual
);

module.exports = router;
