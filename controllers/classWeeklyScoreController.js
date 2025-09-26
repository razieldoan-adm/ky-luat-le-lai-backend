const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const Attendance = require('../models/ClassAttendanceSummary');
const Hygiene = require('../models/ClassHygieneScore');
const Lineup = require('../models/ClassLineUpSummary');
const Violation = require('../models/ClassViolationScore');
const Setting = require('../models/Setting');
const Class = require('../models/Class'); // 🔥 Fix thiếu import

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

    // Lấy dữ liệu từ 4 collection + setting
    const [attendance, hygiene, lineup, violation, settings] = await Promise.all([
      Attendance.find({ weekNumber: week }),
      Hygiene.find({ weekNumber: week }),
      Lineup.find({ weekNumber: week }),
      Violation.find({ weekNumber: week }),
      Setting.findOne({}),
    ]);

    const disciplineMax = settings?.disciplineMax ?? 100;

    const result = {};

    // Gộp dữ liệu theo lớp
    [...attendance, ...hygiene, ...lineup, ...violation].forEach(item => {
      const cls = item.className;
      if (!result[cls]) {
        result[cls] = {
          className: cls,
          grade: item.grade,  // lấy từ model nào có grade
          weekNumber: week,
          attendanceScore: 0,
          hygieneScore: 0,
          lineUpScore: 0,
          violationScore: 0,
          academicScore: 0,   // nhập tay từ frontend
          bonusScore: 0,      // nhập tay từ frontend
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

    // Tính điểm cuối cùng
    for (const cls of Object.values(result)) {
      cls.totalViolation =
        disciplineMax -
        (cls.attendanceScore + cls.hygieneScore + cls.lineUpScore + cls.violationScore);

      cls.totalScore =
        cls.academicScore + cls.bonusScore + cls.totalViolation;
    }

    // Chuẩn hóa dữ liệu trả ra
    let scores = Object.values(result).map(s => ({
      className: s.className,
      grade: s.grade,
      weekNumber: s.weekNumber,
      attendanceScore: s.attendanceScore ?? 0,
      hygieneScore: s.hygieneScore ?? 0,
      lineUpScore: s.lineUpScore ?? 0,
      violationScore: s.violationScore ?? 0,
      academicScore: s.academicScore ?? 0,
      bonusScore: s.bonusScore ?? 0,
      totalViolation: s.totalViolation ?? 0,
      totalScore: s.totalScore ?? 0,
      ranking: s.ranking ?? 0,
    }));

    scores = addRanking(scores);

    res.json(scores);
  } catch (err) {
    console.error("Error in getTempWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cập nhật & tính lại toàn bộ điểm tuần
 */
exports.updateWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;
    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }
    const week = parseInt(weekNumber, 10);

    // 👉 Load lại toàn bộ dữ liệu giống như getTempWeeklyScores
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

    // Xếp hạng
    scores = addRanking(scores);

    // 🔥 Lưu vào ClassWeeklyScore (upsert)
    await Promise.all(
      scores.map(s =>
        ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber: s.weekNumber },
          { $set: s },
          { upsert: true }
        )
      )
    );

    res.json(scores); // Trả lại dữ liệu đã cập nhật cho frontend
  } catch (err) {
    console.error("Error in updateWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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
 * Lưu dữ liệu weekly score vào DB
 */
exports.saveWeeklyScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;
    if (!weekNumber || !scores || !scores.length) {
      return res.status(400).json({ message: "Missing data to save" });
    }

    // 🔥 Lưu từng class
    await Promise.all(
      scores.map(s =>
        ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber },
          { $set: s },
          { upsert: true }
        )
      )
    );

    res.json({ message: "Saved successfully" });
  } catch (err) {
    console.error("Error in saveWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

