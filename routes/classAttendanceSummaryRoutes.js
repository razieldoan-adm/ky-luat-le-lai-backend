const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

// Ghi nhận nghỉ học
router.post("/", attendanceController.recordAbsence);

// Lấy theo ngày / tuần
router.get("/by-date", attendanceController.getByDate);
router.get("/by-week", attendanceController.getByWeek);

// Lấy danh sách nghỉ học không phép
router.get("/unexcused", attendanceController.getUnexcusedAbsences);

// Duyệt phép / xác nhận phép
router.put("/approve/:id", attendanceController.approvePermission);
router.put("/confirm/:id", attendanceController.confirmPermission);

module.exports = router;
