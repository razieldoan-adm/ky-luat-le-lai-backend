// controllers/classLineUpSummaryController.js
const ClassLineUpSummary = require("../models/ClassLineUpSummary");

// 🟢 Thêm bản ghi lỗi xếp hàng
exports.addLineUpViolation = async (req, res) => {
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

    // Xác định buổi tự động nếu không nhập
    let finalSession = session;
    if (!finalSession) {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 7 && hour < 11) finalSession = "Sáng";
      else if (hour >= 13 && hour < 17) finalSession = "Chiều";
      else finalSession = "Khác";
    }

    const newRecord = new ClassLineUpSummary({
      classId,
      date: date || new Date(),
      session: finalSession,
      violationType,
      studentId: studentId || null,
      note: note || "",
      recordedBy,
      pointDeducted: pointDeducted || 10,
    });

    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (err) {
    console.error("Error adding lineup violation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟡 Lấy danh sách vi phạm theo ngày hoặc tuần
exports.getLineUpViolations = async (req, res) => {
  try {
    const { date, weekStart, weekEnd } = req.query;
    const filter = {};

    if (date) {
      const day = new Date(date);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      filter.date = { $gte: day, $lt: next };
    } else if (weekStart && weekEnd) {
      filter.date = {
        $gte: new Date(weekStart),
        $lte: new Date(weekEnd),
      };
    }

    const list = await ClassLineUpSummary.find(filter)
      .populate("classId", "name")
      .populate("studentId", "name")
      .sort({ date: -1 });

    res.json(list);
  } catch (err) {
    console.error("Error fetching lineup violations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔴 Xóa lỗi
exports.deleteLineUpViolation = async (req, res) => {
  try {
    await ClassLineUpSummary.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting violation" });
  }
};
