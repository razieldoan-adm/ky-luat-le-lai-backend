// controllers/classLineUpSummaryController.js
const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const Setting = require('../models/Setting');
const AcademicWeek = require("../models/AcademicWeek");

// Helper: lấy điểm mặc định (thử nhiều tên trường trong Setting, fallback = 10)
function getDefaultPenalty(setting) {
  if (!setting) return 10;
  return setting.defaultLineUpPenalty
    ?? setting.defaultViolationScore
    ?? setting.lineUpScore
    ?? 10;
}

// 🔹 Ghi nhận lỗi xếp hàng
exports.createRecord = async (req, res) => {
  try {
    const { className, studentName, violation, recorder, date } = req.body;

    // 🔹 1. Tìm tuần tương ứng theo ngày
    const targetWeek = await AcademicWeek.findOne({
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    const weekNumber = targetWeek ? targetWeek.weekNumber : null;

    // 🔹 2. Lấy điểm mặc định từ Setting (hoặc 10 nếu chưa có)
    const setting = await Setting.findOne();
    const defaultScore = setting?.lineUpScore || 10;

    // 🔹 3. Tạo record
    const record = new ClassLineUpSummary({
      className,
      studentName,
      violation,
      recorder,
      date,
      weekNumber, // ✅ thêm vào đây
      scoreChange: -Math.abs(defaultScore),
    });

    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error("Lỗi ghi nhận:", err);
    res.status(500).json({ message: "Không thể ghi nhận vi phạm" });
  }
};

// 🔹 Lấy danh sách vi phạm trong tuần hiện tại (Tuần: Thứ 2 -> CN)
exports.getWeeklySummary = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    let targetWeek = null;

    if (weekNumber) {
      targetWeek = await AcademicWeek.findOne({ weekNumber: Number(weekNumber) });
    } else {
      const today = new Date();
      targetWeek = await AcademicWeek.findOne({
        startDate: { $lte: today },
        endDate: { $gte: today },
      });
    }

    if (!targetWeek) return res.status(404).json({ message: "Không xác định được tuần" });

    const records = await ClassLineUpSummary.find({ weekNumber: targetWeek.weekNumber }).sort({ date: -1 });
    res.json({
      weekNumber: targetWeek.weekNumber,
      startDate: targetWeek.startDate,
      endDate: targetWeek.endDate,
      records,
    });
  } catch (err) {
    console.error("Lỗi getWeeklySummary:", err);
    res.status(500).json({ message: "Không thể tải dữ liệu" });
  }
};


// 🔹 Lấy tất cả bản ghi (nếu cần) — giữ cho tương thích
exports.getAllRecords = async (req, res) => {
  try {
    const records = await ClassLineUpSummary.find().sort({ date: -1 });
    return res.json(records);
  } catch (err) {
    console.error('getAllRecords error:', err);
    return res.status(500).json({ message: 'Lỗi khi lấy danh sách' });
  }
};

// 🔹 Xóa vi phạm
exports.deleteRecord = async (req, res) => {
  try {
    const id = req.params.id;
    const record = await ClassLineUpSummary.findByIdAndDelete(id);
    if (!record) return res.status(404).json({ message: 'Không tìm thấy vi phạm' });
    return res.json({ message: 'Đã xóa vi phạm', deleted: record });
  } catch (err) {
    console.error('deleteRecord error:', err);
    return res.status(500).json({ message: 'Không thể xóa vi phạm' });
  }
};
