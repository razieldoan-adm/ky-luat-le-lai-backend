const Attendance = require("../models/ClassAttendanceSummary");
const ClassWeeklyScore = require("../models/ClassWeeklyScore");
const Setting = require("../models/Setting");
const dayjs = require("dayjs");

// 🟩 1. Ghi nhận học sinh nghỉ học (ngày tùy chọn, mặc định hôm nay)
exports.addAttendanceRecord = async (req, res) => {
  try {
    const { className, grade, studentName, date, session } = req.body;
    if (!className || !grade || !studentName || !session)
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết" });

    // nếu không truyền ngày, mặc định là hôm nay
    const targetDate = date || dayjs().format("YYYY-MM-DD");

    // Tự tính weekNumber theo ngày (đảm bảo đồng bộ với hệ thống tuần)
    const startOfYear = dayjs(targetDate).startOf("year");
    const weekNumber = dayjs(targetDate).diff(startOfYear, "week") + 1;

    // Kiểm tra trùng bản ghi
    const existing = await Attendance.findOne({
      className,
      grade,
      studentName,
      date: targetDate,
      session,
    });

    if (existing) {
      return res.status(400).json({ message: "Học sinh này đã được ghi nghỉ buổi này" });
    }

    const record = new Attendance({
      className,
      grade,
      studentName,
      date: targetDate,
      session,
      permission: false,
      weekNumber,
    });

    await record.save();
    res.status(201).json({ message: "Đã ghi nhận học sinh nghỉ học", record });
  } catch (error) {
    console.error("❌ Lỗi khi thêm nghỉ học:", error);
    res.status(500).json({ message: "Lỗi server khi thêm nghỉ học", error });
  }
};

// 🟨 2. Duyệt phép (GVCN hoặc Giám thị)
exports.approveAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Attendance.findById(id);
    if (!record) return res.status(404).json({ message: "Không tìm thấy bản ghi" });

    record.permission = true;
    await record.save();

    res.status(200).json({ message: "Đã duyệt phép cho học sinh", record });
  } catch (error) {
    console.error("❌ Lỗi khi duyệt phép:", error);
    res.status(500).json({ message: "Lỗi server khi duyệt phép", error });
  }
};

// 🟦 3. Lấy danh sách nghỉ học (ngày hoặc tuần)
exports.getAttendanceList = async (req, res) => {
  try {
    const { className, viewMode, date, weekNumber } = req.query;
    let filter = {};

    if (className) filter.className = className;
    if (viewMode === "week" && weekNumber)
      filter.weekNumber = Number(weekNumber);
    else if (date)
      filter.date = date;

    const records = await Attendance.find(filter).sort({ date: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách nghỉ học:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách nghỉ học", error });
  }
};

// 🟥 4. Tính điểm phạt nghỉ học không phép trong tuần
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

    const setting = await Setting.findOne({});
    const coef = setting?.attendanceCoefficient ?? 5;
    const violationScore = unexcusedCount * coef;

    let weekly = await ClassWeeklyScore.findOne({ className, grade, weekNumber });
    if (!weekly)
      weekly = new ClassWeeklyScore({ className, grade, weekNumber, attendanceScore: violationScore });
    else weekly.attendanceScore = violationScore;

    await weekly.save();

    res.status(200).json({
      message: "Đã tính điểm phạt nghỉ học",
      unexcusedCount,
      attendanceCoefficient: coef,
      violationScore,
    });
  } catch (error) {
    console.error("❌ Lỗi khi tính điểm phạt:", error);
    res.status(500).json({ message: "Lỗi server khi tính điểm phạt", error });
  }
};
