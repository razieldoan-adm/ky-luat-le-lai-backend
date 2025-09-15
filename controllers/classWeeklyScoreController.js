const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const Setting = require('../models/Setting'); // cần lấy disciplineMax từ bảng cấu hình
const { calculateWeeklyScores } = require('../services/calculateWeeklyScores');

exports.getWeeklyScores = async (req, res) => {
  const { weekNumber } = req.query;
  const scores = await ClassWeeklyScore.find({ weekNumber });
  res.json(scores);
};

exports.calculateWeeklyScores = async (req, res) => {
  const { weekNumber } = req.body;
  const data = await calculateWeeklyScores(weekNumber);
  res.json(data);
};

exports.calculateTotalRank = async (req, res) => {
  try {
    const { weekNumber } = req.body;

    // Lấy disciplineMax từ settings
    const setting = await Setting.findOne();
    const disciplineMax = setting?.disciplineMax || 100;

    // Lấy dữ liệu điểm tuần
    const scores = await ClassWeeklyScore.find({ weekNumber });

    // Gom theo khối
    const grouped = {};
    scores.forEach(s => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    for (const grade in grouped) {
      grouped[grade].forEach(s => {
        // Tổng điểm trừ (vi phạm)
        const totalMinus =
          (s.disciplineScore || 0) +
          (s.hygieneScore || 0) +
          (s.attendanceScore || 0) +
          (s.lineUpScore || 0);

        // Điểm nề nếp còn lại
        const totalViolation = disciplineMax - totalMinus;

        // Tổng điểm xếp hạng
        s.totalScore =
          (s.academicScore || 0) +
          totalViolation +
          (s.bonusScore || 0);
      });

      // Xếp hạng trong từng khối
      grouped[grade].sort((a, b) => b.totalScore - a.totalScore);
      grouped[grade].forEach((s, i) => {
        s.rank = i + 1;
      });
    }

    await Promise.all(scores.map(s => s.save()));
    res.json(scores);
  } catch (err) {
    console.error("Error in calculateTotalRank:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.saveWeeklyScores = async (req, res) => {
  const { weekNumber, scores } = req.body;
  await Promise.all(
    scores.map(async (s) => {
      await ClassWeeklyScore.updateOne(
        { className: s.className, weekNumber },
        { ...s, weekNumber },
        { upsert: true }
      );
    })
  );
  res.json({ message: 'Saved' });
};
