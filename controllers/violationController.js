const Violation = require('../models/Violation');
const Rule = require('../models/Rule');
const Setting = require('../models/Setting');
const MeritScore = require('../models/MeritScore');

// Cập nhật điểm hạnh kiểm vào collection riêng
const updateMeritScore = async (studentName, className) => {
  const settings = await Setting.findOne();
  const allViolations = await Violation.find({ name: studentName, className });

  const totalPenalty = allViolations.reduce((sum, v) => sum + (v.penalty || 0), 0);
  const maxMerit = settings?.maxMeritScore || 100;
  const meritScore = Math.max(maxMerit - totalPenalty, 0);

  await MeritScore.findOneAndUpdate(
    { name: studentName, className },
    { score: meritScore, timestamp: new Date() },
    { upsert: true }
  );
};

// Tìm học sinh có tên gần giống (không phân biệt hoa thường)
exports.searchViolations = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  try {
    const regex = new RegExp(name, 'i');
    const matches = await Violation.find({ name: regex }).distinct('name');
    const results = [];

    for (const matchedName of matches) {
      const v = await Violation.findOne({ name: matchedName });
      results.push({ name: v.name, className: v.className });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Lấy vi phạm theo học sinh
exports.getViolationsByStudent = async (req, res) => {
  const { name } = req.params;
  const { className } = req.query;

  try {
    const violations = await Violation.find({ name, className });
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Ghi nhận vi phạm mới (lưu cả weekNumber)
exports.createViolation = async (req, res) => {
  const { name, className, description, handlingMethod, weekNumber } = req.body;

  try {
    const rule = await Rule.findOne({ title: description }); // ✅ đúng field title
    const penalty = rule ? rule.point : 0;

    const violation = new Violation({
      name,
      className,
      description,
      penalty,
      handlingMethod,
      week: weekNumber // ✅ lưu weekNumber vào field week
    });

    await violation.save();
    await updateMeritScore(name, className);

    res.status(201).json(violation);
  } catch (error) {
    console.error('Lỗi khi ghi nhận vi phạm:', error);
    res.status(500).json({ error: 'Lỗi khi ghi nhận vi phạm.' });
  }
};

// Xử lý vi phạm (cập nhật handled + handlingMethod)
exports.handleViolation = async (req, res) => {
  const { id } = req.params;
  const { handled, handlingMethod } = req.body;

  try {
    const updated = await Violation.findByIdAndUpdate(
      id,
      { handled, handlingMethod },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy vi phạm' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi xử lý vi phạm' });
  }
};

// Đánh dấu vi phạm đã xử lý
exports.markViolationHandled = async (req, res) => {
  const { id } = req.params;

  try {
    const violation = await Violation.findByIdAndUpdate(
      id,
      { handled: true },
      { new: true }
    );

    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    res.json({ message: 'Violation marked as handled', violation });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Xoá vi phạm
exports.deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const violation = await Violation.findByIdAndDelete(id);

    if (!violation) {
      return res.status(404).json({ error: 'Không tìm thấy vi phạm để xoá.' });
    }

    await updateMeritScore(violation.name, violation.className);
    res.status(200).json({ message: 'Đã xoá vi phạm và cập nhật điểm.' });
  } catch (error) {
    console.error('❌ Lỗi khi xoá vi phạm:', error);
    res.status(500).json({ error: 'Không thể xoá vi phạm.' });
  }
};

// Lấy danh sách học sinh có lỗi chưa xử lý (gộp theo name + className)
exports.getUnhandledViolationStudents = async (req, res) => {
  try {
    const unhandled = await Violation.aggregate([
      { $match: { handled: false } },
      {
        $group: {
          _id: { name: "$name", className: "$className" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          className: "$_id.className",
          count: 1
        }
      }
    ]);

    res.json(unhandled);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Lấy toàn bộ vi phạm (dành cho trang admin hoặc tổng hợp)
exports.getAllViolationStudents = async (req, res) => {
  try {
    const violations = await Violation.find().sort({ time: -1 });
    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách vi phạm' });
  }
};

exports.getViolationCount = async (req, res) => {
  try {
    const count = await Violation.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUnhandledViolationCount = async (req, res) => {
  try {
    const count = await Violation.countDocuments({ handled: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.countMultipleViolations = async (req, res) => {
  try {
    const result = await Violation.aggregate([
      {
        $group: {
          _id: { name: "$name", className: "$className" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 3 } } },
      { $count: "count" }
    ]);

    res.json({ count: result[0]?.count || 0 });
  } catch (err) {
    console.error('Lỗi khi đếm học sinh vi phạm nhiều lần:', err);
    res.status(500).json({ error: 'Server error' });
  }
};