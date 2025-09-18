const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const Attendance = require('../models/ClassAttendanceSummary');
const Hygiene = require('../models/ClassHygieneScore');
const Lineup = require('../models/ClassLineUpSummary');
const Violation = require('../models/ClassViolationScore');
const Setting = require('../models/Setting');

/**
 * Lấy dữ liệu đã lưu của tuần (sau khi người dùng Save)
 */
exports.getWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    let scores = await ClassWeeklyScore.find({ weekNumber }).lean();

    // Bổ sung logic xếp hạng
    scores = addRanking(scores);

    res.json(scores);
  } catch (err) {
    console.error("Error in getWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Lấy dữ liệu thô cho tuần (chưa tính toán, chưa nhập học tập/thưởng)
 */
exports.getTempWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    const week = parseInt(weekNumber, 10);

    const [attendance, hygiene, lineup, violation, settings] = await Promise.all([
      Attendance.find({ weekNumber: week }),
      Hygiene.find({ weekNumber: week }),
      Lineup.find({ weekNumber: week }),
      Violation.find({ weekNumber: week }),
      Setting.findOne({}),
    ]);

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
          lineupScore: 0,
          violationScore: 0,
          academicScore: 0,
          bonusScore: 0,
          totalViolation: 0,
          totalScore: 0,
          ranking: 0,
        };
      }

      if (item.attendanceScore !== undefined)
        result[cls].attendanceScore += item.attendanceScore;
      if (item.hygieneScore !== undefined)
        result[cls].hygieneScore += item.hygieneScore;
      if (item.lineupScore !== undefined)
        result[cls].lineupScore += item.lineupScore;
      if (item.violationScore !== undefined)
        result[cls].violationScore += item.violationScore;
    });

    // Tính điểm cuối cùng
    const disciplineMax = settings?.disciplineMax ?? 100;
    for (const cls of Object.values(result)) {
      cls.totalViolation = disciplineMax
        - (cls.attendanceScore + cls.hygieneScore + cls.lineupScore + cls.violationScore);

      cls.totalScore = cls.academicScore + cls.bonusScore + cls.totalViolation;
    }

    let scores = Object.values(result);

    // Xếp hạng theo tổng điểm
    scores = addRanking(scores);

    res.json(scores);
  } catch (err) {
    console.error("Error in getTempWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};



/**
 * Lưu điểm tuần (sau khi frontend đã tính toán xong)
 */
exports.saveWeeklyScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;
    if (!weekNumber || !scores) {
      return res.status(400).json({ message: "Missing data" });
    }

    await Promise.all(
      scores.map(async (s) => {
        await ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber },
          { ...s, weekNumber },
          { upsert: true }
        );
      })
    );

    res.json({ message: "Saved" });
  } catch (err) {
    console.error("Error in saveWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Hàm phụ: Thêm xếp hạng vào danh sách điểm
 */
function addRanking(scores) {
  // Sắp xếp theo tổng điểm giảm dần
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
