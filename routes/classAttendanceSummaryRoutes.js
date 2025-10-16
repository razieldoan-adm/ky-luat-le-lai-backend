const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/classAttendanceSummaryController");

// 📋 Lấy danh sách học sinh theo lớp
router.get("/students/:className", attendanceController.getStudentsByClass);

// ➕ Ghi nhận nghỉ học
router.post("/record", attendanceController.recordAttendance);

// 📅 Lấy danh sách nghỉ học
router.get("/list", attendanceController.getAttendanceList);

// ❌ Xóa bản ghi nghỉ học
router.delete("/:id", attendanceController.deleteAttendance);

// ✅ Cập nhật nghỉ có phép / không phép
router.put("/:id/excuse", attendanceController.updateExcuseStatus);

module.exports = router;
