const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/classAttendanceSummaryController");

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

router.delete("/:id", attendanceController.deleteAttendanceRecord);
router.get("/weekly-summary", attendanceController.getWeeklyUnexcusedSummary);

// ✅ Lấy toàn bộ bản ghi nghỉ học của 1 học sinh
router.get("/by-student/:studentId", attendanceController.getAttendanceByStudent);

// ✅ (Tuỳ chọn) Lấy thống kê tổng quan chuyên cần học sinh
router.get("/by-student/:studentId/summary", attendanceController.getStudentAttendanceSummary);

module.exports = router;
