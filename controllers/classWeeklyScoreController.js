const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const XLSX = require("xlsx");

/**
 * GET /weekly-scores?weekNumber=6
 * Lấy dữ liệu tuần đã lưu trong DB
 */
exports.getWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    const scores = await ClassWeeklyScore.find({ weekNumber }).lean();
    res.json(scores);
  } catch (err) {
    console.error("Error in getWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /weekly-scores/update
 * Cập nhật điểm (gọi chung cho lineup, hygiene, violation,...)
 */
exports.updateWeeklyScores = async (req, res) => {
  try {
    const {
      className,
      grade,
      weekNumber,
      hygieneScore,
      lineupScore,
      attendanceScore,
      violationScore,
    } = req.body;

    if (!className || !weekNumber || !grade) {
      return res.status(400).json({ message: "Thiếu className, weekNumber hoặc grade" });
    }

    // ✅ Tìm hoặc tạo mới
    let weekly = await ClassWeeklyScore.findOne({ className, weekNumber });
    if (!weekly) {
      weekly = new ClassWeeklyScore({ className, grade, weekNumber });
    }

    // ✅ Gán 4 loại điểm
    weekly.hygieneScore = hygieneScore ?? weekly.hygieneScore ?? 0;
    weekly.lineupScore = lineupScore ?? weekly.lineupScore ?? 0;
    weekly.attendanceScore = attendanceScore ?? weekly.attendanceScore ?? 0;
    weekly.violationScore = violationScore ?? weekly.violationScore ?? 0;

    await weekly.save();

    res.json({ message: "✅ Đã lưu điểm tuần", data: weekly });
  } catch (err) {
    console.error("❌ Lỗi trong updateWeeklyScores:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /weekly-scores/weeks
 * Lấy danh sách tuần đã có dữ liệu
 */
exports.getWeeksWithScores = async (req, res) => {
  try {
    const weeks = await ClassWeeklyScore.distinct("weekNumber");
    res.json(weeks.sort((a, b) => a - b));
  } catch (err) {
    console.error("Error in getWeeksWithScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /weekly-scores/:weekNumber
 * Xóa dữ liệu của 1 tuần
 */
exports.deleteWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    await ClassWeeklyScore.deleteMany({ weekNumber });
    res.json({ message: `Đã xóa dữ liệu tuần ${weekNumber}` });
  } catch (err) {
    console.error("Error in deleteWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /weekly-scores/export/:weekNumber
 * Xuất dữ liệu tuần ra Excel
 */
exports.exportWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;
    if (!weekNumber) return res.status(400).json({ message: "Thiếu weekNumber" });

    const scores = await ClassWeeklyScore.find({ weekNumber }).lean();
    const worksheet = XLSX.utils.json_to_sheet(scores);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");

    const filePath = `/tmp/weekly_scores_${weekNumber}.xlsx`;
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, `weekly_scores_${weekNumber}.xlsx`);
  } catch (err) {
    console.error("Error in exportWeeklyScores:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Lưu toàn bộ điểm nhập thủ công trong trang Tổng kết tuần
exports.saveManualWeeklyScores = async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu để lưu." });
    }

    let updatedList = [];

    for (const rec of records) {
      const {
        className,
        grade,
        weekNumber,
        academicScore = 0,
        rewardScore = 0,
        hygieneScore = 0,
        lineupScore = 0,
        attendanceScore = 0,
        violationScore = 0,
      } = rec;

      if (!className || !grade || !weekNumber) continue;

      // ✅ Tính lại disciplineScore và totalScore
      const disciplineScore =
        hygieneScore + lineupScore + attendanceScore + violationScore;

      const totalScore = academicScore + rewardScore + disciplineScore;

      const updated = await ClassWeeklyScore.findOneAndUpdate(
        { className, grade, weekNumber },
        {
          $set: {
            academicScore,
            rewardScore,
            hygieneScore,
            lineupScore,
            attendanceScore,
            violationScore,
            disciplineScore,
            totalScore,
          },
        },
        { new: true, upsert: true }
      );

      updatedList.push(updated);
    }

    // ✅ Sau khi lưu xong, tính lại thứ hạng trong cùng khối
    const grade = records[0].grade;
    const weekNumber = records[0].weekNumber;
    const allInGrade = await ClassWeeklyScore.find({ grade, weekNumber })
      .sort({ totalScore: -1 });

    for (let i = 0; i < allInGrade.length; i++) {
      allInGrade[i].ranking = i + 1;
      await allInGrade[i].save();
    }

    res.json({
      message: "✅ Đã lưu toàn bộ điểm tuần và cập nhật xếp hạng.",
      data: updatedList,
    });
  } catch (err) {
    console.error("❌ Lỗi trong saveManualWeeklyScores:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
/**
 * GET /weekly-scores/full/:weekNumber
 * → Lấy toàn bộ dữ liệu tổng hợp của 1 tuần (cho trang Tổng kết tuần)
 */
exports.getFullWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;

    if (!weekNumber) {
      return res.status(400).json({ message: "Thiếu tham số weekNumber" });
    }

    const scores = await ClassWeeklyScore.find({ weekNumber })
      .sort({ grade: 1, ranking: 1 })
      .lean();

    if (!scores.length) {
      return res.status(404).json({
        message: `Không tìm thấy dữ liệu cho tuần ${weekNumber}`,
      });
    }

    res.json({
      message: `✅ Dữ liệu tổng hợp của tuần ${weekNumber}`,
      weekNumber: Number(weekNumber),
      totalClasses: scores.length,
      data: scores,
    });
  } catch (err) {
    console.error("❌ Lỗi trong getFullWeeklyScores:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
