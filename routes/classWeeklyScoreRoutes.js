const express = require("express");
const router = express.Router();
const classWeeklyScoreController = require("../controllers/classWeeklyScoreController");

// lấy dữ liệu đã lưu
router.get("/", classWeeklyScoreController.getWeeklyScores);

// lấy dữ liệu thô theo tuần
router.get("/temp/:weekNumber", classWeeklyScoreController.getTempWeeklyScores);

// lưu dữ liệu lần đầu
router.post("/save", classWeeklyScoreController.saveWeeklyScores);

// cập nhật lại toàn bộ điểm + xếp hạng
router.put("/update/:weekNumber", classWeeklyScoreController.updateWeeklyScores);

module.exports = router;
