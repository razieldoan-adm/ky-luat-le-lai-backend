const ClassAttendanceSummary = require('../models/ClassAttendanceSummary');

exports.getByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    const summaries = await ClassAttendanceSummary.find({ weekNumber });
    res.json(summaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.saveSummaries = async (req, res) => {
  try {
    const { weekNumber, summaries } = req.body;

    // 1. Xoá toàn bộ dữ liệu tuần này
    await ClassAttendanceSummary.deleteMany({ weekNumber });

    // 2. Thêm mới toàn bộ summaries
    const inserted = await ClassAttendanceSummary.insertMany(
      summaries.map(s => ({
        className: s.className,
        grade: s.grade,
        weekNumber,
        data: s.data,
        total: s.total,
      }))
    );

    res.json({ message: 'Saved successfully', insertedCount: inserted.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getByWeekAndClass = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber || !className) {
      return res.status(400).json({ message: 'Thiếu weekNumber hoặc className.' });
    }

    const summaries = await ClassAttendanceSummary.find({
      weekNumber: Number(weekNumber),
      className
    });

    res.json(summaries);
  } catch (err) {
    console.error('❌ Lỗi getByWeekAndClass (Attendance):', err);
    res.status(500).json({ message: 'Server error' });
  }
};
