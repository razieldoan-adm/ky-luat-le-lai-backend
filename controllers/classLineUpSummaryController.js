// controllers/classLineUpSummaryController.js
const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const Setting = require('../models/Setting');
const AcademicWeek = require("../models/AcademicWeek");
const ClassWeeklyScore = require('../models/ClassWeeklyScore');

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

    // 🔹 3. Tạo record (⚡ đổi sang điểm dương)
    const record = new ClassLineUpSummary({
      className,
      studentName,
      violation,
      recorder,
      date,
      weekNumber,
      scoreChange: Math.abs(defaultScore), // ✅ Ghi dương để thống nhất công thức tính
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


// 🔹 Lấy tất cả bản ghi (nếu cần)
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

// 🔹 Tổng hợp điểm xếp hàng theo lớp trong tuần + lưu vào ClassWeeklyScore
exports.getClassLineUpTotal = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    const records = await ClassLineUpSummary.find({ weekNumber: Number(weekNumber) });

    // Gom nhóm theo lớp
    const grouped = {};
    records.forEach((r) => {
      if (!grouped[r.className]) grouped[r.className] = [];
      grouped[r.className].push(r.scoreChange);
    });

    // Tổng hợp và lưu
    const result = await Promise.all(Object.keys(grouped).map(async (className) => {
      const scores = grouped[className];
      const total = scores.reduce((a, b) => a + b, 0);

      // ✅ Lưu tổng dương vào ClassWeeklyScore.lineUpScore
      await ClassWeeklyScore.findOneAndUpdate(
        { className, weekNumber: Number(weekNumber) },
        {
          $set: {
            lineUpScore: total,
            lastUpdated: new Date(),
          },
        },
        { upsert: true }
      );

      return { className, scores, total, count: scores.length };
    }));

    res.json(result);
  } catch (err) {
    console.error("Lỗi getClassLineUpTotal:", err);
    res.status(500).json({ message: "Không thể tính tổng điểm xếp hàng" });
  }
};

// 🔹 Cập nhật hoặc tạo mới điểm xếp hàng của lớp trong tuần (thủ công)
exports.updateWeeklyLineUpScore = async (req, res) => {
  try {
    const { className, weekNumber, lineUpScore } = req.body;
    if (!className || !weekNumber)
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });

    const updated = await ClassWeeklyScore.findOneAndUpdate(
      { className, weekNumber },
      {
        $set: {
          lineUpScore: lineUpScore || 0,
          lastUpdated: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("Lỗi updateWeeklyLineUpScore:", err);
    res.status(500).json({ message: "Không thể cập nhật điểm xếp hàng" });
  }
};
