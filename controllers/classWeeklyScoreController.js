const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const { calculateWeeklyScores } = require('../services/calculateWeeklyScores');

exports.getWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;

    if (!weekNumber) {
      return res.status(400).json({ message: 'Thiếu weekNumber.' });
    }

    const scores = await ClassWeeklyScore.find({ weekNumber }).sort({ grade: 1, rank: 1 });
    res.json(scores);
  } catch (err) {
    console.error('❌ Lỗi khi lấy weekly scores:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.calculateWeeklyScores = async (req, res) => {
  const { weekNumber } = req.body;
  const data = await calculateWeeklyScores(weekNumber);
  res.json(data);
};

exports.calculateTotalRank = async (req, res) => {
  const { weekNumber } = req.body;
  const scores = await ClassWeeklyScore.find({ weekNumber });

  // Tính totalScore và rank theo khối
  const grouped = {};
  scores.forEach(s => {
    if (!grouped[s.grade]) grouped[s.grade] = [];
    grouped[s.grade].push(s);
  });

  for (const grade in grouped) {
    grouped[grade].forEach(s => {
      s.totalScore = s.academicScore + s.disciplineScore + s.hygieneScore + s.attendanceScore + s.lineUpScore;
    });
    grouped[grade].sort((a, b) => b.totalScore - a.totalScore);
    grouped[grade].forEach((s, i) => { s.rank = i + 1; });
  }

  await Promise.all(scores.map(s => s.save()));
  res.json(scores);
};

exports.saveWeeklyScores = async (req, res) => {
  const { weekNumber, scores } = req.body;
  await Promise.all(scores.map(async (s) => {
    await ClassWeeklyScore.updateOne(
      { className: s.className, weekNumber },
      { ...s, weekNumber },
      { upsert: true }
    );
  }));
  res.json({ message: 'Saved' });
};
