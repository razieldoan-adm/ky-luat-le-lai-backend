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
    let {
      className,
      grade,
      weekNumber,
      hygieneScore,
      lineupScore,
      attendanceScore,
      violationScore,
    } = req.body;

    console.log("📩 BODY nhận được từ frontend:", req.body);

    // ✅ Nếu frontend không gửi grade, tự bóc từ tên lớp (VD: "7A1" -> "7")
    if (!grade && className) {
      const match = className.match(/^(\d+)/);
      grade = match ? match[1] : "Khác";
    }

    if (!className || !weekNumber || !grade) {
      return res.status(400).json({ message: "Thiếu className, weekNumber hoặc grade" });
    }

    // ✅ Tìm hoặc tạo mới
    let weekly = await ClassWeeklyScore.findOne({ className, weekNumber });
    if (!weekly) {
      weekly = new ClassWeeklyScore({ className, grade, weekNumber });
    }

    // ✅ Gán điểm từng loại
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

    const updatedList = [];

    for (const rec of records) {
      const {
        className,
        grade,
        weekNumber,
        academicScore = 0,
        bonusScore = 0,        // ✅ đúng với schema
        hygieneScore = 0,
        attendanceScore = 0,
        lineupScore = 0,       // ✅ đúng với schema
        violationScore = 0,
        totalViolation = 0,    // ✅ đúng với schema
        totalScore = 0,
        rank = 0,              // ✅ đúng với schema
      } = rec;

      if (!className || !grade || !weekNumber) continue;

      // ✅ Ghi đúng field name trong schema
      const updated = await ClassWeeklyScore.findOneAndUpdate(
        { className, grade, weekNumber },
        {
          $set: {
            className,
            grade,
            weekNumber,
            academicScore: Number(academicScore) || 0,
            bonusScore: Number(bonusScore) || 0,
            hygieneScore: Number(hygieneScore) || 0,
            attendanceScore: Number(attendanceScore) || 0,
            lineUpScore: Number(lineupScore) || 0,
            violationScore: Number(violationScore) || 0,
            totalViolation: Number(totalViolation) || 0,
            totalScore: Number(totalScore) || 0,
            rank: Number(rank) || 0,
            lastUpdated: new Date(),
          },
        },
        { new: true, upsert: true }
      );

      updatedList.push(updated);
    }

    res.json({
      message: "✅ Đã lưu toàn bộ điểm tuần (theo tính toán frontend).",
      data: updatedList,
    });
  } catch (err) {
    console.error("❌ Lỗi khi lưu điểm:", err);
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
