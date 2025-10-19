const Attendance = require("../models/ClassAttendanceSummary");
const dayjs = require("dayjs");

// 🧩 Hàm bỏ dấu tiếng Việt (chuẩn hóa tìm kiếm không phân biệt hoa thường / dấu)
function normalizeVietnamese(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

// ✅ Ghi nhận học sinh nghỉ học
exports.recordAbsence = async (req, res) => {
  try {
    const { studentId, studentName, className, grade, date, session } = req.body;

    if (!studentId || !studentName || !className || !grade || !session) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const formattedDate = date
      ? dayjs(date).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD");

    const existing = await Attendance.findOne({
      studentId,
      date: formattedDate,
      session,
    });

    if (existing) {
      return res.status(400).json({
        message: "Đã ghi nhận học sinh này trong buổi này.",
      });
    }

    const attendance = new Attendance({
      studentId,
      studentName,
      studentNameNormalized: normalizeVietnamese(studentName),
      className,
      classNameNormalized: normalizeVietnamese(className),
      grade,
      date: formattedDate,
      session,
      permission: false,
    });

    await attendance.save();
    res.status(201).json({ message: "Đã ghi nhận nghỉ học.", attendance });
  } catch (error) {
    console.error("❌ Lỗi khi ghi nhận nghỉ học:", error);
    res.status(500).json({
      message: "Lỗi server khi ghi nhận nghỉ học",
      error,
    });
  }
};

// ✅ Lấy danh sách nghỉ học theo ngày
exports.getByDate = async (req, res) => {
  try {
    const { className, grade, date, search } = req.query;
    if (!className || !date) {
      return res.status(400).json({
        message: "Thiếu className hoặc date.",
      });
    }

    const formattedDate = dayjs(date).format("YYYY-MM-DD");

    const filter = {
      className,
      date: formattedDate,
    };
    if (grade) filter.grade = grade;

    // Nếu có tìm kiếm tên học sinh
    if (search && search.trim()) {
      const keyword = normalizeVietnamese(search);
      filter.studentNameNormalized = { $regex: keyword, $options: "i" };
    }

    const records = await Attendance.find(filter).sort({
      session: 1,
      studentName: 1,
    });

    res.status(200).json(records);
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách theo ngày:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách nghỉ học",
      error,
    });
  }
};

// ✅ Lấy danh sách nghỉ học theo tuần
exports.getByWeek = async (req, res) => {
  try {
    const { className, grade, startDate, endDate, search } = req.query;
    if (!className || !startDate || !endDate) {
      return res.status(400).json({
        message: "Thiếu className, startDate hoặc endDate.",
      });
    }

    const start = dayjs(startDate).format("YYYY-MM-DD");
    const end = dayjs(endDate).format("YYYY-MM-DD");

    const filter = {
      className,
      date: { $gte: start, $lte: end },
    };
    if (grade) filter.grade = grade;

    // Tìm kiếm không phân biệt hoa / dấu
    if (search && search.trim()) {
      const keyword = normalizeVietnamese(search);
      filter.studentNameNormalized = { $regex: keyword, $options: "i" };
    }

    const records = await Attendance.find(filter).sort({
      date: 1,
      session: 1,
      studentName: 1,
    });

    res.status(200).json(records);
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách theo tuần:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách nghỉ học theo tuần",
      error,
    });
  }
};

// ✅ Duyệt nghỉ có phép
exports.approvePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Attendance.findById(id);
    if (!record)
      return res.status(404).json({ message: "Không tìm thấy bản ghi." });

    record.permission = true;
    await record.save();

    res.status(200).json({ message: "Đã duyệt nghỉ có phép.", record });
  } catch (error) {
    console.error("❌ Lỗi khi duyệt nghỉ có phép:", error);
    res.status(500).json({
      message: "Lỗi server khi duyệt nghỉ có phép",
      error,
    });
  }
};
