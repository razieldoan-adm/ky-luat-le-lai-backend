const Attendance = require("../models/Attendance");

// Tạo bản ghi nghỉ học
exports.createAttendance = async (req, res) => {
  try {
    const { studentId, studentName, className, date, permission } = req.body;

    if (!studentId || !studentName || !className || !date) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    const attendance = new Attendance({
      student: studentId,
      studentName,
      className,
      date: new Date(date),
      permission: permission === "co-phep" ? "co-phep" : "khong-phep",
    });

    await attendance.save();
    res.status(201).json({ message: "Đã ghi nhận nghỉ học", attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server khi ghi nhận nghỉ học" });
  }
};

// Cập nhật trạng thái nghỉ học (duyệt phép / không phép)
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { permission } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy bản ghi" });
    }

    attendance.permission = permission === "co-phep" ? "co-phep" : "khong-phep";
    await attendance.save();

    res.json({ message: "Đã cập nhật trạng thái", attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server khi cập nhật nghỉ học" });
  }
};

// Xoá bản ghi nghỉ học
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    await Attendance.findByIdAndDelete(id);
    res.json({ message: "Đã xoá bản ghi nghỉ học" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server khi xoá nghỉ học" });
  }
};

// Lấy danh sách nghỉ học của lớp theo ngày hoặc tuần
exports.getAttendanceByClass = async (req, res) => {
  try {
    const { className, startDate, endDate } = req.query;

    const filter = { className };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách nghỉ học" });
  }
};
