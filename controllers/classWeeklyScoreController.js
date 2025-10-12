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
      weekNumber,
      violationScore,
      hygieneScore,
      lineUpScore,
      otherScore,
    } = req.body;

    if (!className || !weekNumber) {
      return res.status(400).json({ message: "Thiếu className hoặc weekNumber" });
    }

    // 🔹 Tìm bản ghi (theo lớp + tuần)
    let weekly = await ClassWeeklyScore.findOne({ className, weekNumber });
    if (!weekly) {
      weekly = new ClassWeeklyScore({ className, weekNumber });
    }

    // 🔹 Cập nhật các trường nếu được truyền
    if (typeof violationScore === "number") weekly.violationScore = violationScore;
    if (typeof hygieneScore === "number") weekly.hygieneScore = hygieneScore;
    if (typeof lineUpScore === "number") weekly.lineUpScore = lineUpScore;
    if (typeof otherScore === "number") weekly.otherScore = otherScore;

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
