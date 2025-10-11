const express = require("express");
const router = express.Router();
const controller = require("../controllers/classWeeklyScoreController");

// 🔹 Lấy danh sách điểm các lớp trong tuần hiện tại hoặc theo tuần cụ thể
router.get("/weekly", controller.getWeeklyScores);

// 🔹 Cập nhật hoặc tạo mới điểm cho lớp trong tuần (chung cho tất cả các loại điểm)
router.post("/update", controller.updateWeeklyScore);

// 🔹 (Tuỳ chọn) Lấy tổng hợp điểm hoặc bảng xếp hạng
router.get("/ranking", controller.getWeeklyRanking);

module.exports = router;
