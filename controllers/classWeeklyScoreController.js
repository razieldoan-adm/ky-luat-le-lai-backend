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
          academicScore: 0,   // học tập nhập tay từ frontend
          bonusScore: 0,      // thưởng nhập tay từ frontend
          totalViolation: 0,
          totalScore: 0,
          ranking: 0,
        };
      }

      // ✅ Mapping đúng field từng model
      if (item.constructor.modelName === 'ClassAttendanceSummary') {
        result[cls].attendanceScore += item.total ?? 0;   // dùng total
      }

      if (item.constructor.modelName === 'ClassHygieneScore') {
        result[cls].hygieneScore += item.totalScore ?? 0; // dùng totalScore
      }

      if (item.constructor.modelName === 'ClassLineUpSummary') {
        result[cls].lineUpScore += item.total ?? 0;       // dùng total
      }

      if (item.constructor.modelName === 'ClassViolationScore') {
        result[cls].violationScore += item.totalScore ?? 0; // dùng totalScore
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
exports.updateWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;

    if (!weekNumber) {
      return res.status(400).json({ message: "Missing weekNumber" });
    }

    // Lấy danh sách lớp có GVCN
    const classes = await Class.find({ teacher: { $ne: '' } }).lean();

    const results = await Promise.all(
      classes.map(async (cls) => {
        // Lấy dữ liệu điểm thành phần
        const attendance = await Attendance.findOne({ className: cls.className, weekNumber });
        const hygiene = await Hygiene.findOne({ className: cls.className, weekNumber });
        const violation = await Violation.findOne({ className: cls.className, weekNumber });

        const attendanceScore = attendance?.score ?? 0;
        const hygieneScore = hygiene?.score ?? 0;
        const violationScore = violation?.score ?? 0;

        const total = attendanceScore + hygieneScore + violationScore;

        // Upsert điểm mới
        await ClassWeeklyScore.updateOne(
          { className: cls.className, weekNumber },
          {
            className: cls.className,
            weekNumber,
            attendanceScore,
            hygieneScore,
            violationScore,
            total,
          },
          { upsert: true }
        );

        return { className: cls.className, total };
      })
    );

    // Xếp hạng lại theo tổng điểm
    const sorted = [...results].sort((a, b) => b.total - a.total);
    for (let i = 0; i < sorted.length; i++) {
      await ClassWeeklyScore.updateOne(
        { className: sorted[i].className, weekNumber },
        { rank: i + 1 }
      );
    }

    res.json({ message: "Weekly scores recalculated and updated successfully" });
  } catch (err) {
    console.error("Error in updateWeeklyScores:", err);
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
