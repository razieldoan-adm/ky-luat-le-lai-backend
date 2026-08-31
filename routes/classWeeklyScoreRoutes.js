const express = require("express");
const router = express.Router();
const controller = require("../controllers/classWeeklyScoreController");

// 🔹 Lấy dữ liệu điểm các lớp theo tuần cụ thể
// GET /api/weekly-scores/weekly?weekNumber=6
router.get("/weekly", controller.getWeeklyScores);

// 🔹 Cập nhật hoặc tạo mới điểm cho lớp trong tuần (dùng chung cho lineup, hygiene, violation,...)
// POST /api/weekly-scores/update
router.post("/update", controller.updateWeeklyScores);
router.post("/save-manual", controller.saveManualWeeklyScores);
// 🔹 Lấy danh sách các tuần đã có dữ liệu
// GET /api/weekly-scores/weeks
router.get("/weeks", controller.getWeeksWithScores);

// 🔹 Xóa toàn bộ dữ liệu của một tuần
// DELETE /api/weekly-scores/:weekNumber
router.delete("/:weekNumber", controller.deleteWeeklyScores);

router.get(
  "/academic-years",
  controller.getAcademicYearsWithScores
);

// 🔹 Xuất Excel dữ liệu điểm của tuần
// GET /api/weekly-scores/export/:weekNumber
router.get("/export/:weekNumber", controller.exportWeeklyScores);
router.get("/full/:weekNumber", controller.getFullWeeklyScores);
module.exports = router;

