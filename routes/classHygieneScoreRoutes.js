
// routes/classHygieneScoreRoutes.js
const express = require("express");
const router = express.Router();
const classHygieneScoreController = require("../controllers/classHygieneScoreController");

// Lưu điểm vệ sinh cả tuần (upsert theo lớp)
router.post("/", classHygieneScoreController.saveClassHygieneScores);

// Lấy toàn bộ điểm vệ sinh theo tuần (tất cả lớp + records)
router.get("/", classHygieneScoreController.getClassHygieneScoresByWeek);

// Lấy điểm vệ sinh của 1 lớp trong tuần
router.get(
  "/by-week-and-class",
  classHygieneScoreController.getByWeekAndClass
);

// Lấy tổng hợp điểm theo tuần (chỉ className + grade + total)
router.get(
  "/summary/:weekNumber",
  classHygieneScoreController.getSummaryByWeek
);

module.exports = router;

