// controllers/classHygieneScoreController.js

const ClassHygieneScore = require('../models/ClassHygieneScore');

/**
 * @desc Lưu điểm tổng cuối cùng của các lớp trong tuần
 * @route POST /api/class-hygiene-scores
 */
exports.saveClassHygieneScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;

    if (!weekNumber || !scores) {
      return res.status(400).json({ message: 'Thiếu dữ liệu weekNumber hoặc scores' });
    }

    await ClassHygieneScore.deleteMany({ weekNumber });

    const inserted = await ClassHygieneScore.insertMany(
      scores.map(s => ({
        className: s.className,
        grade: s.grade,
        weekNumber,
        scores: s.scores,       // ✅ lưu trạng thái checkbox
        totalScore: s.totalScore
      }))
    );

    res.json({ message: 'Đã lưu điểm vệ sinh thành công.', data: inserted });
  } catch (err) {
    console.error('Lỗi khi lưu hygiene scores:', err);
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

    const scores = await ClassHygieneScore.find({ weekNumber });
    res.json(scores);
  } catch (err) {
    console.error('❌ Lỗi khi lấy hygiene scores:', err);
    res.status(500).json({
      error: 'Lỗi server khi lấy hygiene scores',
      detail: err.message
    });
  }
};
exports.getByWeekAndClass = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber || !className) {
      return res.status(400).json({ message: 'Thiếu weekNumber hoặc className.' });
    }

    const scores = await ClassHygieneScore.find({
      weekNumber: Number(weekNumber),
      className
    });

    res.json(scores);
  } catch (err) {
    console.error('❌ Lỗi getByWeekAndClass (Hygiene):', err);
    res.status(500).json({ message: 'Server error' });
  }
};
