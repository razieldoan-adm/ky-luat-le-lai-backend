const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

// Ghi nhận nghỉ học
router.post("/", attendanceController.recordAbsence);

// Lấy danh sách
router.get("/by-date", attendanceController.getByDate);
router.get("/by-week", attendanceController.getByWeek);

// Duyệt phép & xác nhận
router.put("/approve/:id", attendanceController.approvePermission);
router.put("/confirm/:id", attendanceController.confirmAbsence);

// Lấy danh sách nghỉ không phép
router.get("/unexcused", attendanceController.getUnexcusedAbsences);

module.exports = router;
