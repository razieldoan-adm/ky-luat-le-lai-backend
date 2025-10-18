const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/classAttendanceSummaryController");

// Ghi nhận học sinh nghỉ học
router.post("/record", attendanceController.recordAbsence);

// Xem danh sách nghỉ học theo ngày
router.get("/by-date", attendanceController.getByDate);

// Xem danh sách nghỉ học theo tuần
router.get("/by-week", attendanceController.getByWeek);

// Duyệt nghỉ có phép (dành cho GVCN)
router.put("/approve/:id", attendanceController.approvePermission);

module.exports = router;
