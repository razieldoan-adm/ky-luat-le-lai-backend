// controllers/classHygieneScoreController.js
const ClassHygieneScore = require('../models/ClassHygieneScore');

/**
 * @desc Lưu hoặc cập nhật điểm vệ sinh cho 1 lớp trong tuần
 * @route POST /api/class-hygiene-scores
 */
exports.saveClassHygieneScores = async (req, res) => {
  try {
    const { className, grade, weekNumber, records } = req.body;

    if (!className || !grade || !weekNumber || !records) {
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
    }

    const updated = await ClassHygieneScore.findOneAndUpdate(
      { className, weekNumber },
      { grade, className, weekNumber, records },
      { upsert: true, new: true }
    );

    res.json({ message: 'Đã lưu điểm vệ sinh thành công', data: updated });
  } catch (err) {
    console.error('❌ Lỗi khi lưu hygiene scores:', err);
    res.status(500).json({ error: 'Lỗi server', detail: err.message });
  }
};

/**
 * @desc Lấy danh sách tất cả lớp theo tuần
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
    res.status(500).json({ error: 'Lỗi server', detail: err.message });
  }
};

/**
 * @desc Lấy chi tiết 1 lớp trong 1 tuần
 * @route GET /api/class-hygiene-scores/by-week-and-class?weekNumber=31&className=6A1
 */
exports.getByWeekAndClass = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber || !className) {
      return res.status(400).json({ message: 'Thiếu weekNumber hoặc className.' });
    }

    const score = await ClassHygieneScore.findOne({
      weekNumber: Number(weekNumber),
      className,
    });

    res.json(score);
  } catch (err) {
    console.error('❌ Lỗi getByWeekAndClass (Hygiene):', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

/**
 * @desc Tính tổng điểm vệ sinh của 1 lớp trong 1 tuần
 * @route GET /api/class-hygiene-scores/weekly-total?weekNumber=31&className=6A1
 */
exports.getWeeklyTotal = async (req, res) => {
  try {
    const { weekNumber, className } = req.query;

    if (!weekNumber || !className) {
      return res.status(400).json({ message: 'Thiếu weekNumber hoặc className' });
    }

    const record = await ClassHygieneScore.findOne({
      weekNumber: Number(weekNumber),
      className,
    });

    if (!record) {
      return res.json({ className, weekNumber: Number(weekNumber), total: 0 });
    }

    let totalErrors = 0;
    for (const r of record.records) {
      for (const v of r.violations) {
        totalErrors += v.count || 0;
      }
    }
    const total = totalErrors * 10;

    res.json({ className, weekNumber: Number(weekNumber), total });
  } catch (err) {
    console.error('❌ Lỗi khi tính hygiene weekly total:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

/**
 * @desc Tổng hợp tất cả lớp trong tuần + total
 * @route GET /api/class-hygiene-scores/weekly-summary?weekNumber=31
 */
exports.getWeeklySummary = async (req, res) => {
  try {
    const { weekNumber } = req.query;

    if (!weekNumber) {
      return res.status(400).json({ message: 'Thiếu weekNumber.' });
    }

    const records = await ClassHygieneScore.find({ weekNumber: Number(weekNumber) });

    const result = records.map(r => {
      let totalErrors = 0;
      for (const rec of r.records) {
        for (const v of rec.violations) {
          totalErrors += v.count || 0;
        }
      }
      const total = totalErrors * 10;

      return {
        className: r.className,
        grade: r.grade,
        weekNumber: r.weekNumber,
        total,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Lỗi getWeeklySummary (Hygiene):', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};
