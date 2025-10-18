const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

// Ghi nhận học sinh nghỉ học
router.post("/add", attendanceController.addAttendanceRecord);

// Duyệt phép
router.put("/approve/:id", attendanceController.approveAttendance);

// Lấy danh sách nghỉ học (theo ngày hoặc tuần)
router.get("/", attendanceController.getAttendanceList);

// Thống kê nghỉ không phép theo tuần
router.get("/weekly-summary", attendanceController.getWeeklyUnexcusedAbsenceCount);

module.exports = router;
