const express = require("express");
const router = express.Router();
const controller = require("../controllers/classLineUpSummaryController");

// 🔹 Ghi nhận vi phạm xếp hàng (tạo mới)
router.post("/", controller.createRecord);

// 🔹 Lấy tất cả bản ghi (nếu cần)
router.get("/", controller.getAllRecords);

// 🔹 Lấy danh sách vi phạm trong tuần hiện tại hoặc theo tuần cụ thể
router.get("/weekly", controller.getWeeklySummary);

// 🔹 Xóa vi phạm
router.delete("/:id", controller.deleteRecord);

// 🔹 Tổng hợp điểm xếp hàng theo lớp trong tuần + tự lưu vào ClassWeeklyScore
router.get("/total", controller.getClassLineUpTotal);

// 🔹 Cập nhật hoặc tạo mới điểm xếp hàng theo lớp trong tuần (thủ công)
router.post("/update-weekly-score", controller.updateWeeklyLineUpScore);

module.exports = router;
