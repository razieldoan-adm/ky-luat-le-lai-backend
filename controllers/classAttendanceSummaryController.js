const Attendance = require("../models/ClassAttendanceSummary");
const ClassWeeklyScore = require("../models/ClassWeeklyScore");
const Setting = require("../models/Setting");

/** 🟢 Ghi nhận học sinh nghỉ học (mặc định không phép) */
exports.recordAttendance = async (req, res) => {
  try {
    const { studentName, studentId, className, grade, weekNumber, date } = req.body;

    if (!studentName || !className || !grade || !weekNumber) {
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });
    }

    const record = new Attendance({
      studentName,
      studentId,
      className,
      grade,
      weekNumber,
      date,
      permission: false, // mặc định không phép
    });

    await record.save();

    // 🔄 Cập nhật điểm chuyên cần tự động
    await updateWeeklyAttendanceScore(className, grade, weekNumber);

    res.status(201).json({ message: "Đã ghi nhận học sinh nghỉ học (không phép)", record });
  } catch (error) {
    console.error("❌ Lỗi ghi nhận nghỉ học:", error);
    res.status(500).json({ message: "Lỗi server khi ghi nhận nghỉ học" });
  }
};

/** 🟡 GVCN duyệt chuyển sang nghỉ có phép */
exports.approvePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy bản ghi nghỉ học" });
    }

    attendance.permission = true;
    await attendance.save();

    // 🔄 Cập nhật lại điểm tuần
    await updateWeeklyAttendanceScore(attendance.className, attendance.grade, attendance.weekNumber);

    res.json({ message: "Đã duyệt nghỉ có phép cho học sinh", attendance });
  } catch (error) {
    console.error("❌ Lỗi khi duyệt nghỉ có phép:", error);
    res.status(500).json({ message: "Lỗi server khi duyệt nghỉ có phép" });
  }
};

/** 📊 Lấy danh sách nghỉ theo tuần/lớp */
exports.getWeeklyAttendance = async (req, res) => {
  try {
    const { className, grade, weekNumber } = req.query;

    const filter = {};
    if (className) filter.className = className;
    if (grade) filter.grade = grade;
    if (weekNumber) filter.weekNumber = weekNumber;

    const list = await Attendance.find(filter).sort({ date: 1 });

    res.json(list);
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách nghỉ:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách nghỉ" });
  }
};

/** ⚙️ Hàm nội bộ - Tính điểm chuyên cần và cập nhật ClassWeeklyScore */
const updateWeeklyAttendanceScore = async (className, grade, weekNumber) => {
  try {
    // Đếm số lượt nghỉ không phép
    const unexcusedCount = await Attendance.countDocuments({
      className,
      grade,
      weekNumber,
      permission: false,
    });

    // Lấy hệ số điểm phạt từ Setting
    const setting = await Setting.findOne({});
    const attendanceCoefficient =
      setting?.attendanceCoefficient !== undefined ? setting.attendanceCoefficient : 5;

    // Tính điểm phạt
    const attendanceScore = unexcusedCount * attendanceCoefficient;

    // Cập nhật ClassWeeklyScore
    let weekly = await ClassWeeklyScore.findOne({ className, grade, weekNumber });

    if (!weekly) {
      weekly = new ClassWeeklyScore({ className, grade, weekNumber, attendanceScore });
    } else {
      weekly.attendanceScore = attendanceScore;
    }

    await weekly.save();
  } catch (error) {
    console.error("⚠️ Lỗi khi cập nhật điểm chuyên cần:", error);
  }
};

exports.getWeeklyUnexcusedAbsenceCount = async (req, res) => {
  try {
    const { className, grade, weekNumber } = req.query;
    if (!className || !grade || !weekNumber)
      return res.status(400).json({ message: "Thiếu className, grade hoặc weekNumber" });

    const unexcusedCount = await Attendance.countDocuments({
      className,
      grade,
      weekNumber,
      permission: false,
    });

    res.json({ className, grade, weekNumber, unexcusedCount });
  } catch (error) {
    console.error("❌ Lỗi khi đếm nghỉ không phép:", error);
    res.status(500).json({ message: "Lỗi server khi đếm nghỉ không phép" });
  }
};
