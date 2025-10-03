// controllers/classHygieneScoreController.js
const ClassHygieneScore = require('../models/ClassHygieneScore');

/**
 * @desc Lưu điểm vệ sinh cho cả tuần (upsert từng lớp)
 * @route POST /api/class-hygiene-scores
 */
exports.saveClassHygieneScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;

    if (!weekNumber || !scores) {
      return res.status(400).json({ message: 'Thiếu dữ liệu weekNumber hoặc scores' });
    }

    for (const s of scores) {
      await ClassHygieneScore.findOneAndUpdate(
        { className: s.className, weekNumber },
        {
          grade: s.grade,
          scores: s.scores, // ✅ mảng 3D
          total: s.total,   // ✅ tổng tính frontend
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Đã lưu điểm vệ sinh thành công.' });
  } catch (err) {
    console.error('❌ Lỗi khi lưu hygiene scores:', err);
    res.status(500).json({ error: 'Lỗi server', detail: err.message });
  }
};

/**
 * @desc Lấy điểm vệ sinh theo tuần
 * @route GET /api/class-hygiene-scores?weekNumber=31
 */
exports.getClassHygieneScoresByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;

    if (!weekNumber) {
      return res.status(400).json({ message: 'Thiếu weekNumber.' });
    }

    const scores = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) });
    res.json(scores);
  } catch (err) {
    console.error('❌ Lỗi khi lấy hygiene scores:', err);
    res.status(500).json({
      error: 'Lỗi server khi lấy hygiene scores',
      detail: err.message
    });
  }
};

/**
 * @desc Lấy điểm vệ sinh theo tuần + lớp
 * @route GET /api/class-hygiene-scores/by-week-and-class?weekNumber=31&className=6A1
 */
exports.getByWeekAndClass = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber || !className) {
      return res.status(400).json({ message: 'Thiếu weekNumber hoặc className.' });
    }

    const scores = await ClassHygieneScore.findOne({
      weekNumber: Number(weekNumber),
      className
    });

    res.json(scores);
  } catch (err) {
    console.error('❌ Lỗi getByWeekAndClass (Hygiene):', err);
    res.status(500).json({ message: 'Server error' });
  }
};
