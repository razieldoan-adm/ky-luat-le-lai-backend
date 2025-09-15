const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const { calculateWeeklyScores } = require('../services/calculateWeeklyScores');

/**
 * Lấy dữ liệu điểm theo tuần
 */
exports.getWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    const scores = await ClassWeeklyScore.find({ weekNumber });
    res.json(scores);
  } catch (err) {
    console.error("Error in getWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Tính điểm tuần và lưu vào DB
 */
exports.calculateWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.body;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    // Tính toán điểm từ service
    const data = await calculateWeeklyScores(weekNumber);

    // Lưu vào DB
    await Promise.all(data.map(async (s) => {
      await ClassWeeklyScore.updateOne(
        { className: s.className, weekNumber },
        { ...s, weekNumber },
        { upsert: true }
      );
    }));

    res.json(data);
  } catch (err) {
    console.error("Error in calculateWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Tính tổng điểm & xếp hạng theo khối
 */
exports.calculateTotalRank = async (req, res) => {
  try {
    const { weekNumber } = req.body;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    const scores = await ClassWeeklyScore.find({ weekNumber });

    // Gom theo khối
    const grouped = {};
    scores.forEach(s => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    // Tính totalViolation và totalRankScore
    for (const grade in grouped) {
      grouped[grade].forEach(s => {
        // totalViolation = disciplineMax - (các vi phạm)
        s.totalViolation =
          (s.disciplineMax || 0) -
          ((s.disciplineScore || 0) +
            (s.hygieneScore || 0) +
            (s.attendanceScore || 0) +
            (s.lineUpScore || 0));

        // totalRankScore = điểm học tập + thưởng + còn lại
        s.totalRankScore =
          (s.academicScore || 0) +
          (s.bonusScore || 0) +
          s.totalViolation;
      });

      // Sắp xếp theo totalRankScore giảm dần
      grouped[grade].sort((a, b) => b.totalRankScore - a.totalRankScore);

      // Gán rank
      grouped[grade].forEach((s, i) => {
        s.rank = i + 1;
      });
    }

    // Lưu lại DB
    await Promise.all(scores.map(s => s.save()));

    res.json(scores);
  } catch (err) {
    console.error("Error in calculateTotalRank:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Lưu thủ công điểm tuần
 */
exports.saveWeeklyScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;
    if (!weekNumber || !scores) {
      return res.status(400).json({ message: "Missing data" });
    }

    await Promise.all(scores.map(async (s) => {
      await ClassWeeklyScore.updateOne(
        { className: s.className, weekNumber },
        { ...s, weekNumber },
        { upsert: true }
      );
    }));

    res.json({ message: 'Saved' });
  } catch (err) {
    console.error("Error in saveWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};
