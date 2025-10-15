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
    const { className, studentName, violation, recorder, date, note } = req.body;

    // 1️⃣ Tìm tuần tương ứng theo ngày
    const targetWeek = await AcademicWeek.findOne({
      startDate: { $lte: date },
      endDate: { $gte: date },
    });
    const weekNumber = targetWeek ? targetWeek.weekNumber : null;

    // 2️⃣ Lấy điểm mặc định từ Setting (hoặc 10 nếu chưa có)
    const setting = await Setting.findOne();
    const defaultScore = setting?.lineUpScore || 10;

    // 3️⃣ Tạo record (điểm luôn dương)
    const record = new ClassLineUpSummary({
      className,
      studentName,
      violation,
      recorder,
      date,
      weekNumber,
      scoreChange: Math.abs(defaultScore),
      note: note || "", // ⚡ bây giờ note đã được khai báo
    });

    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error("Lỗi ghi nhận:", err);
    res.status(500).json({ message: "Không thể ghi nhận vi phạm", error: err.message });
  }
};


// 🔹 Lấy danh sách vi phạm trong tuần
exports.getWeeklySummary = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber) {
      return res.status(400).json({ message: "Thiếu tham số weekNumber" });
    }

    const query = { weekNumber: Number(weekNumber) };
    if (className) query.className = className;

    const records = await ClassLineUpSummary.find(query);

    res.status(200).json({
      message: "Lấy danh sách lineup thành công",
      records,
    });
  } catch (err) {
    console.error("Lỗi getWeeklySummary:", err);
    res.status(500).json({
      message: "Lỗi server khi lấy dữ liệu lineup",
      error: err.message,
    });
  }
};


// 🔹 Lấy tất cả bản ghi
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

      // ✅ Luôn lưu tổng điểm dương
      await ClassWeeklyScore.findOneAndUpdate(
        { className, weekNumber: Number(weekNumber) },
        {
          $set: {
            lineUpScore: Math.abs(total),
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

// 🔹 Cập nhật thủ công điểm xếp hàng


exports.updateWeeklyLineUpScore = async (req, res) => {
  try {
    const { className, weekNumber, lineUpScore } = req.body;

    if (!className || !weekNumber) {
      return res.status(400).json({ message: "Thiếu className hoặc weekNumber" });
    }

    // ✅ Cập nhật hoặc tạo mới, chỉ thay đổi field lineUpScore
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

    return res.json({
      message: "✅ Đã cập nhật điểm lineup thành công",
      data: updated,
    });
  } catch (err) {
    console.error("❌ Lỗi updateWeeklyLineUpScore:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
