const ClassAttendanceSummary = require("../models/ClassAttendanceSummary");
const Student = require("../models/Student");
const ClassWeeklyScore = require("../models/ClassWeeklyScore");

// 📋 Lấy danh sách học sinh theo lớp
exports.getStudentsByClass = async (req, res) => {
  try {
    const { className } = req.params;
    const students = await Student.find({ className }).select("name");
    res.json(students);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách học sinh:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách học sinh" });
  }
};

// ➕ Ghi nhận nghỉ học
exports.recordAttendance = async (req, res) => {
  try {
    const { className, studentName, date, session, recordedBy } = req.body;

    if (!className || !studentName || !date || !session)
      return res.status(400).json({ error: "Thiếu thông tin cần thiết" });

    const student = await Student.findOne({ name: studentName, className });

    const record = new ClassAttendanceSummary({
      className,
      studentId: student?._id,
      studentName,
      date,
      session,
      recordedBy,
      isExcused: false, // mặc định là nghỉ không phép
    });

    await record.save();
    res.json(record);
  } catch (err) {
    console.error("Lỗi khi ghi nhận nghỉ học:", err);
    res.status(500).json({ error: "Lỗi server khi ghi nhận nghỉ học" });
  }
};

// 📅 Lấy danh sách nghỉ học theo lớp và ngày
exports.getAttendanceList = async (req, res) => {
  try {
    const { className, date } = req.query;
    const query = {};

    if (className) query.className = className;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const records = await ClassAttendanceSummary.find(query)
      .populate("studentId", "name")
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách nghỉ học:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách nghỉ học" });
  }
};

// ❌ Xóa bản ghi nghỉ học
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    await ClassAttendanceSummary.findByIdAndDelete(id);
    res.json({ message: "Đã xóa bản ghi thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa bản ghi:", err);
    res.status(500).json({ error: "Lỗi server khi xóa bản ghi" });
  }
};

// ✅ Cập nhật trạng thái nghỉ có phép / không phép
exports.updateExcuseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isExcused } = req.body;

    const updated = await ClassAttendanceSummary.findByIdAndUpdate(
      id,
      { isExcused },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Không tìm thấy bản ghi" });
    res.json(updated);
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái có phép:", err);
    res.status(500).json({ error: "Lỗi server khi cập nhật trạng thái" });
  }
};

// controllers/classAttendanceSummaryController.js


exports.calculateAttendanceScore = async (req, res) => {
  try {
    const { className, grade, weekNumber } = req.body;

    // ⚙️ Hệ số điểm mỗi lượt nghỉ (bạn có thể chỉnh)
    const ATTENDANCE_MULTIPLIER = -2; // ví dụ: mỗi lượt nghỉ không phép = -2 điểm

    if (!className || !weekNumber || !grade) {
      return res.status(400).json({ message: "Thiếu className, weekNumber hoặc grade" });
    }

    // 📅 Lấy tất cả bản ghi nghỉ học của lớp trong tuần đó
    const absences = await ClassAttendanceSummary.find({ className, weekNumber });

    // Đếm số lượt nghỉ không phép
    const unexcusedCount = absences.filter(a => a.excuse === false).length;

    // ✅ Tính điểm chuyên cần: chỉ cần nhân hệ số
    const attendanceScore = unexcusedCount * ATTENDANCE_MULTIPLIER;

    // 🧾 Lưu vào bảng ClassWeeklyScore
    let weekly = await ClassWeeklyScore.findOne({ className, weekNumber });
    if (!weekly) {
      weekly = new ClassWeeklyScore({ className, grade, weekNumber });
    }

    weekly.attendanceScore = attendanceScore;
    await weekly.save();

    res.json({
      message: "✅ Đã tính điểm chuyên cần",
      data: {
        className,
        weekNumber,
        unexcusedCount,
        attendanceScore,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi tính điểm chuyên cần:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

