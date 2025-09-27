const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const Attendance = require('../models/ClassAttendanceSummary');
const Hygiene = require('../models/ClassHygieneScore');
const Lineup = require('../models/ClassLineUpSummary');
const Violation = require('../models/ClassViolationScore');
const Setting = require('../models/Setting');

/**
 * Hàm phụ: Thêm xếp hạng vào danh sách điểm
 */
function addRanking(scores) {
  scores.sort((a, b) => b.totalScore - a.totalScore);

  let currentRank = 0;
  let lastScore = null;
  let count = 0;

  scores.forEach((s) => {
    count++;
    if (s.totalScore !== lastScore) {
      currentRank = count;
      lastScore = s.totalScore;
    }
    s.ranking = currentRank;
  });

  return scores;
}

/**
 * Hàm nội bộ: tính dữ liệu tạm từ 4 bảng gốc
 */
async function getTempWeeklyScoresInternal(week) {
  const [attendance, hygiene, lineup, violation, settings] = await Promise.all([
    Attendance.find({ weekNumber: week }),
    Hygiene.find({ weekNumber: week }),
    Lineup.find({ weekNumber: week }),
    Violation.find({ weekNumber: week }),
    Setting.findOne({}),
  ]);

  const disciplineMax = settings?.disciplineMax ?? 100;
  const result = {};

  [...attendance, ...hygiene, ...lineup, ...violation].forEach(item => {
    const cls = item.className;
    if (!result[cls]) {
      result[cls] = {
        className: cls,
        grade: item.grade,
        weekNumber: week,
        attendanceScore: 0,
        hygieneScore: 0,
        lineUpScore: 0,
        violationScore: 0,
        academicScore: 0,
        bonusScore: 0,
        totalViolation: 0,
        totalScore: 0,
        ranking: 0,
      };
    }

    if (item.constructor.modelName === 'ClassAttendanceSummary') {
      result[cls].attendanceScore += item.total ?? 0;
    }
    if (item.constructor.modelName === 'ClassHygieneScore') {
      result[cls].hygieneScore += item.totalScore ?? 0;
    }
    if (item.constructor.modelName === 'ClassLineUpSummary') {
      result[cls].lineUpScore += item.total ?? 0;
    }
    if (item.constructor.modelName === 'ClassViolationScore') {
      result[cls].violationScore += item.totalScore ?? 0;
    }
  });

  for (const cls of Object.values(result)) {
    cls.totalViolation =
      disciplineMax -
      (cls.attendanceScore + cls.hygieneScore + cls.lineUpScore + cls.violationScore);

    cls.totalScore =
      cls.academicScore + cls.bonusScore + cls.totalViolation;
  }

  let scores = Object.values(result);
  scores = addRanking(scores);

  return scores;
}

/**
 * GET dữ liệu đã lưu trong DB (sau khi Save)
 */
exports.getWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    const scores = await ClassWeeklyScore.find({ weekNumber }).lean();

    res.json(scores);
  } catch (err) {
    console.error("Error in getWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET dữ liệu tạm (chưa lưu DB, tính toán từ bảng gốc)
 */
exports.getTempWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    const week = parseInt(weekNumber, 10);
    const scores = await getTempWeeklyScoresInternal(week);

    res.json(scores);
  } catch (err) {
    console.error("Error in getTempWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST lưu dữ liệu tuần (sau khi click Lưu ở frontend)
 */
exports.saveWeeklyScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;
    if (!weekNumber || !scores || !scores.length) {
      return res.status(400).json({ message: "Thiếu dữ liệu để lưu" });
    }

    await Promise.all(
      scores.map(s =>
        ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber },
          {
            $set: {
              ...s,
              academicScore: s.academicScore ?? 0,
              bonusScore: s.bonusScore ?? 0,
              ranking: s.ranking ?? 0,
            }
          },
          { upsert: true }
        )
      )
    );

    res.json({ message: "Đã lưu dữ liệu tuần thành công" });
  } catch (err) {
    console.error("Error in saveWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST cập nhật lại toàn bộ điểm tuần (nếu dữ liệu gốc thay đổi)
 */
exports.updateWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }
    const week = parseInt(weekNumber, 10);

    let scores = await getTempWeeklyScoresInternal(week);

    // Lấy dữ liệu đã lưu để merge lại điểm nhập tay
    const saved = await ClassWeeklyScore.find({ weekNumber: week }).lean();
    const savedMap = Object.fromEntries(saved.map(s => [s.className, s]));

    scores = scores.map(s => ({
      ...s,
      academicScore: savedMap[s.className]?.academicScore ?? s.academicScore ?? 0,
      bonusScore: savedMap[s.className]?.bonusScore ?? s.bonusScore ?? 0,
    }));

    scores = addRanking(scores);

    await Promise.all(
      scores.map(s =>
        ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber: s.weekNumber },
          { $set: s },
          { upsert: true }
        )
      )
    );

    res.json(scores);
  } catch (err) {
    console.error("Error in updateWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET kiểm tra dữ liệu tuần có thay đổi không
 */
exports.checkChanges = async (req, res) => {
  try {
    const { weekNumber } = req.params;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    const saved = await ClassWeeklyScore.find({ weekNumber }).lean();
    const temp = await getTempWeeklyScoresInternal(parseInt(weekNumber, 10));

    const changed = JSON.stringify(saved.map(s => ({
      className: s.className,
      totalScore: s.totalScore,
      ranking: s.ranking,
    }))) !== JSON.stringify(temp.map(s => ({
      className: s.className,
      totalScore: s.totalScore,
      ranking: s.ranking,
    })));

    res.json({ changed });
  } catch (err) {
    console.error("Error in checkChanges:", err);
    res.status(500).json({ message: "Server error" });
  }
};
