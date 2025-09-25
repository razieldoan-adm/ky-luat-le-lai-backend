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
 * Cập nhật điểm tuần (sau khi đã có dữ liệu trước đó)
 */
// controllers/classWeeklyScoreController.js

exports.updateWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;
    const { scores } = req.body;

    if (!weekNumber || !scores) {
      return res.status(400).json({ message: "Missing data" });
    }

    // B1. Upsert điểm thành phần
    await Promise.all(
      scores.map(async (s) => {
        await ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber },
          { ...s, weekNumber },
          { upsert: true }
        );
      })
    );

    // B2. Lấy lại toàn bộ điểm tuần
    const allScores = await ClassWeeklyScore.find({ weekNumber }).lean();

    // B3. Tính lại totalViolation, totalScore, rank
    // giả sử disciplineMax luôn = 100 (nếu có Setting thì lấy từ Setting model)
    const disciplineMax = 100;

    // Cập nhật lại điểm tính toán
    const updatedScores = allScores.map((s) => {
      const totalViolation =
        disciplineMax -
        (Number(s.violationScore || 0) +
          Number(s.hygieneScore || 0) +
          Number(s.attendanceScore || 0) +
          Number(s.lineupScore || s.lineUpScore || 0));

      const totalScore =
        Number(s.academicScore || 0) + Number(s.bonusScore || 0) + totalViolation;

      return {
        ...s,
        totalViolation,
        totalScore,
      };
    });

    // Gom theo khối để tính rank
    const grouped = {};
    updatedScores.forEach((s) => {
      const grade = String(s.grade ?? "undefined");
      if (!grouped[grade]) grouped[grade] = [];
      grouped[grade].push(s);
    });

    // Xếp hạng trong từng khối
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore - a.totalScore);
      let prev = null;
      let prevRank = 0;
      arr.forEach((row, i) => {
        if (prev === null) {
          row.rank = 1;
          prev = row.totalScore;
          prevRank = 1;
        } else if (row.totalScore === prev) {
          row.rank = prevRank;
        } else {
          row.rank = i + 1;
          prev = row.totalScore;
          prevRank = row.rank;
        }
      });
    });

    // B4. Ghi lại DB
    await Promise.all(
      updatedScores.map(async (s) => {
        await ClassWeeklyScore.updateOne(
          { className: s.className, weekNumber },
          { ...s },
          { upsert: true }
        );
      })
    );

    res.json({ message: "Updated & recalculated", scores: updatedScores });
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
