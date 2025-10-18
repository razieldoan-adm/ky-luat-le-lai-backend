// controllers/attendanceController.js
const Attendance = require("../models/ClassAttendanceSummary");
const ClassWeeklyScore = require("../models/ClassWeeklyScore");
const Setting = require("../models/Setting");

// ✅ Đếm số lượt nghỉ học không phép của 1 lớp trong 1 tuần và cập nhật điểm phạt
exports.getWeeklyUnexcusedAbsenceCount = async (req, res) => {
  try {
    const { className, grade, weekNumber } = req.query;
    if (!className || !grade || !weekNumber) {
      return res.status(400).json({ message: "Thiếu className, grade hoặc weekNumber" });
    }

    // 🔍 Đếm số lượt nghỉ không phép trong tuần
    const unexcusedCount = await Attendance.countDocuments({
      className,
      grade,
      weekNumber,
      permission: false, // false = nghỉ không phép
    });

    // 🔍 Lấy hệ số điểm phạt từ bảng Setting (hoặc mặc định = 5)
    const setting = await Setting.findOne({});
    const attendanceCoefficient =
      setting?.attendanceCoefficient !== undefined
        ? setting.attendanceCoefficient
        : 5;

    // 🔢 Tính điểm phạt cho lớp
    const violationScore = unexcusedCount * attendanceCoefficient;

    // ✅ Cập nhật hoặc tạo mới bản ghi ClassWeeklyScore
    let weekly = await ClassWeeklyScore.findOne({ className, grade, weekNumber });

    if (!weekly) {
      weekly = new ClassWeeklyScore({
        className,
        grade,
        weekNumber,
        attendanceScore: violationScore, // hoặc violationScore nếu bạn dùng trường này
      });
    } else {
      weekly.attendanceScore = violationScore;
    }

    await weekly.save();

    return res.status(200).json({
      message: "Đã tính và cập nhật điểm phạt nghỉ học",
      className,
      grade,
      weekNumber,
      unexcusedCount,
      attendanceCoefficient,
      violationScore,
    });
  } catch (error) {
    console.error("Lỗi khi thống kê nghỉ không phép:", error);
    res.status(500).json({ message: "Lỗi server khi thống kê nghỉ không phép", error });
  }
};
