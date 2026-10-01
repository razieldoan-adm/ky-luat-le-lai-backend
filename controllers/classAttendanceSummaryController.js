// controllers/attendanceController.js
const Class = require("../models/Class");
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
exports.recordAbsence = async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      className,
      grade,
      date,
      session,
      permission,
    } = req.body; 
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
    const record = await Attendance.findOneAndUpdate(
      { studentId, date, session },
      {
        studentId,
        studentName,
        className,
        grade,
        date,
        session,
        permission: permission === true,
        weekNumber: week ? week.weekNumber : 0,
        
        // Mặc định chưa phải ngoại lệ
        isException: false,
        exceptionNote: "",
        
        // Chưa đưa vào xử lý hạnh kiểm
        conductReviewed: false,
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
    const { className, grade, week, search } = req.query;

    if (!week) {
      return res.status(400).json({ message: "Thiếu tham số week." });
    }

    // 🔹 Tìm tuần trong bảng AcademicWeek theo số tuần
    const weekData = await AcademicWeek.findOne({ weekNumber: Number(week) });

    if (!weekData) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu tuần này." });
    }

    const start = dayjs(weekData.startDate).format("YYYY-MM-DD");
    const end = dayjs(weekData.endDate).format("YYYY-MM-DD");

    // 🔹 Tạo bộ lọc
    const filter = {
      date: { $gte: start, $lte: end },
    };
    if (className) filter.className = className;
    if (grade) filter.grade = grade;

    // 🔍 Tìm kiếm theo tên (bỏ dấu)
    if (search && search.trim()) {
      const keyword = normalizeVietnamese(search);
      filter.studentNameNormalized = { $regex: keyword, $options: "i" };
    }

    const records = await Attendance.find(filter).sort({
      date: 1,
      session: 1,
      studentName: 1,
    });

    return res.status(200).json({
      message: "Lấy danh sách nghỉ học trong tuần thành công.",
      records,
      weekInfo: weekData,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách nghỉ học theo tuần:", error);
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách nghỉ học theo tuần.",
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

exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Attendance.findByIdAndDelete(id);
    if (!record)
      return res.status(404).json({ message: "Không tìm thấy bản ghi để xoá." });
    res.status(200).json({ message: "Đã xoá bản ghi nghỉ học." });
  } catch (error) {
    console.error("❌ Lỗi khi xoá bản ghi:", error);
    res.status(500).json({ message: "Lỗi server khi xoá bản ghi." });
  }
};

// controllers/attendanceController.js
exports.getWeeklyUnexcusedSummary = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber)
      return res.status(400).json({ message: "Thiếu tham số weekNumber" });

    const week = await AcademicWeek.findOne({ weekNumber: Number(weekNumber) });
    if (!week)
      return res.status(404).json({ message: "Không tìm thấy tuần học" });

    const start = new Date(week.startDate);
    const end = new Date(week.endDate);

    console.log("📅 Lọc dữ liệu từ:", start, "→", end);

    // Truy vấn bản ghi nghỉ không phép
const absences = await Attendance.find({
  permission: false,
  weekNumber: Number(weekNumber),
});

    console.log("🔍 Số bản ghi:", absences.length);

    // Gom nhóm theo lớp
    const classAbsences = {};
    absences.forEach(a => {
      const name = a.className || "Chưa có tên lớp";
      classAbsences[name] = (classAbsences[name] || 0) + 1;
    });

    const classes = await Class.find({}, "className").lean();

    const results = classes.map((cls, index) => ({
      id: index + 1,
      className: cls.className,
      absences: classAbsences[cls.className] || 0,
    }));

    return res.status(200).json({
      message: "✅ Tổng hợp nghỉ học không phép theo tuần thành công",
      results,
    });
  } catch (error) {
    console.error("❌ Lỗi tổng hợp nghỉ học:", error);
    res.status(500).json({
      message: "Lỗi server khi tổng hợp nghỉ học",
      error: error.message,
    });
  }
};

// ✅ Lấy tất cả bản ghi nghỉ học của 1 học sinh
exports.getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ message: "Thiếu studentId" });
    }

    const records = await ClassAttendanceSummary.find({ studentId })
      .sort({ date: -1 })
      .lean();

    res.json(records);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu chuyên cần học sinh:", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách chuyên cần học sinh" });
  }
};

// ✅ (Tuỳ chọn) Thống kê nhanh tình hình chuyên cần
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ message: "Thiếu studentId" });
    }

    const totalAbsences = await ClassAttendanceSummary.countDocuments({ studentId });
    const totalWithPermission = await ClassAttendanceSummary.countDocuments({
      studentId,
      permission: true,
    });
    const totalWithoutPermission = totalAbsences - totalWithPermission;

    res.json({
      totalAbsences,
      totalWithPermission,
      totalWithoutPermission,
    });
  } catch (err) {
    console.error("❌ Lỗi thống kê chuyên cần:", err);
    res.status(500).json({ message: "Lỗi server khi thống kê chuyên cần" });
  }
};

// =====================================================
// ĐÁNH DẤU / HỦY NGOẠI LỆ CHUYÊN CẦN
// =====================================================
exports.setAttendanceException = async (req, res) => {
  try {
    const { id } = req.params;
    const { isException, exceptionNote } = req.body;

    const record = await Attendance.findById(id);

    if (!record) {
      return res.status(404).json({
        message: "Không tìm thấy bản ghi nghỉ học.",
      });
    }

    record.isException = isException === true;
    record.exceptionNote =
      isException === true
        ? String(exceptionNote || "").trim()
        : "";

    // Khi thay đổi ngoại lệ thì cho phép xét hạnh kiểm lại
    record.conductReviewed = false;

    await record.save();

    return res.status(200).json({
      message: record.isException
        ? "Đã đánh dấu trường hợp ngoại lệ."
        : "Đã hủy đánh dấu ngoại lệ.",
      record,
    });
  } catch (error) {
    console.error("❌ Lỗi xử lý ngoại lệ chuyên cần:", error);

    return res.status(500).json({
      message: "Lỗi server khi xử lý ngoại lệ chuyên cần.",
    });
  }
};

