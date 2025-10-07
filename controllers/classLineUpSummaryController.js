// controllers/classLineUpSummaryController.js
const Violation = require("../models/Violation");

// 🟢 Ghi nhận lỗi xếp hàng
exports.addLineupViolation = async (req, res) => {
  try {
    const {
      classId,
      date,
      session,
      violationType,
      studentId,
      note,
      recordedBy,
      pointDeducted,
    } = req.body;

    // Xác định buổi nếu không nhập
    let finalSession = session;
    if (!finalSession) {
      const hour = new Date().getHours();
      if (hour >= 7 && hour < 11) finalSession = "Sáng";
      else if (hour >= 13 && hour < 17) finalSession = "Chiều";
      else finalSession = "Khác";
    }

    const newViolation = new Violation({
      classId,
      date: date || new Date(),
      session: finalSession,
      category: "xep-hang",
      violationType,
      studentId: studentId || null,
      note: note || "",
      recordedBy,
      pointDeducted: pointDeducted || 10, // mặc định 10 điểm
    });

    await newViolation.save();
    res.status(201).json(newViolation);
  } catch (error) {
    console.error("Error adding lineup violation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟡 Lấy danh sách lỗi theo ngày hoặc tuần
exports.getLineupViolations = async (req, res) => {
  try {
    const { date, week } = req.query;
    const filter = { category: "xep-hang" };

    if (date) {
      const day = new Date(date);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      filter.date = { $gte: day, $lt: next };
    }

    if (week) {
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);
      filter.date = { $gte: start, $lte: end };
    }

    const list = await Violation.find(filter)
      .populate("classId", "name")
      .populate("studentId", "name")
      .sort({ date: -1 });

    res.json(list);
  } catch (error) {
    console.error("Error fetching lineup violations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔴 Xóa lỗi
exports.deleteLineupViolation = async (req, res) => {
  try {
    await Violation.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting violation" });
  }
};
