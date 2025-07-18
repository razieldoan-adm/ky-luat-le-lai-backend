// controllers/classLineUpSummaryController.js
const ClassLineUpSummary = require('../models/ClassLineUpSummary');

exports.getByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    const summaries = await ClassLineUpSummary.find({ weekNumber });
    res.json(summaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.saveSummaries = async (req, res) => {
  try {
    const { weekNumber, summaries } = req.body;

    for (const s of summaries) {
      await ClassLineUpSummary.findOneAndUpdate(
        { className: s.className, weekNumber },
        {
          grade: s.grade,
          data: s.data,
          total: s.total,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Saved successfully' });
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

    const summaries = await ClassLineUpSummary.find({
      weekNumber: Number(weekNumber),
      className
    });

    res.json(summaries);
  } catch (err) {
    console.error('❌ Lỗi getByWeekAndClass (LineUp):', err);
    res.status(500).json({ message: 'Server error' });
  }
};
