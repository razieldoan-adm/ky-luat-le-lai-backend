// controllers/attendanceController.js
const Attendance = require("../models/ClassAttendanceSummary");
const AcademicWeek = require("../models/AcademicWeek");
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
// ✅ Ghi nhận học sinh nghỉ học
exports.recordAbsence = async (req, res) => {
  try {
    const { studentId, studentName, className, grade, date, session } = req.body;

    // 🔍 Kiểm tra dữ liệu đầu vào
    if (!studentId || !studentName || !className || !grade || !date || !session) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    // ✅ Xác định tuần học tương ứng với ngày nghỉ
    const formattedDate = dayjs(date).startOf("day").toDate();

    const week = await AcademicWeek.findOne({
      startDate: { $lte: formattedDate },
      endDate: { $gte: formattedDate },
    });

    if (!week) {
      console.warn("⚠️ Không tìm thấy tuần tương ứng cho ngày:", date);
    }

    // ✅ Ghi nhận hoặc cập nhật bản ghi nghỉ học
    const record = await ClassAttendanceSummary.findOneAndUpdate(
      { studentId, date, session },
      {
        studentId,
        studentName,
        className,
        grade,
        date,
        session,
        permission: false, // mặc định là không phép
        weekNumber: week ? week.weekNumber : 0, // nếu không tìm thấy tuần thì gán 0
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Ghi nhận nghỉ học thành công.",
      record,
    });
  } catch (error) {
    console.error("❌ Lỗi ghi nhận nghỉ học:", error);
    return res.status(500).json({ message: "Lỗi server khi ghi nhận nghỉ học." });
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

// ✅ Duyệt nghỉ có phép (route: /api/attendance/approve/:id)
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

// ✅ Lấy danh sách nghỉ học không phép (route: /api/attendance/unexcused)
exports.getUnexcusedAbsences = async (req, res) => {
  try {
    const { className, weekNumber, startDate, endDate } = req.query;
    const filter = { permission: false };

    if (className) filter.className = className;

    // Nếu có tuần → lọc trong tuần đó
    if (startDate && endDate) {
      filter.date = {
        $gte: dayjs(startDate).format("YYYY-MM-DD"),
        $lte: dayjs(endDate).format("YYYY-MM-DD"),
      };
    }

    const absences = await Attendance.find(filter).sort({
      date: 1,
      session: 1,
      studentName: 1,
    });

    res.status(200).json(absences);
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách nghỉ học không phép:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách nghỉ học không phép",
      error,
    });
  }
};

// ✅ Xác nhận có phép (route: /api/attendance/confirm/:id)
exports.confirmPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Attendance.findById(id);
    if (!record)
      return res.status(404).json({ message: "Không tìm thấy bản ghi." });

    record.permission = true;
    await record.save();

    res.status(200).json({ message: "✅ Đã xác nhận có phép.", record });
  } catch (error) {
    console.error("❌ Lỗi khi xác nhận có phép:", error);
    res.status(500).json({
      message: "Lỗi server khi xác nhận có phép",
      error,
    });
  }
};
