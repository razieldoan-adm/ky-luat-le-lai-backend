// controllers/classAcademicScoreController.js
const ClassAcademicScore = require('../models/ClassAcademicScore');

// Lấy tất cả điểm
exports.getAllClassAcademicScores = async (req, res) => {
  try {
    const scores = await ClassAcademicScore.find();
    res.json(scores);
  } catch (error) {
    console.error('Lỗi khi lấy exam scores:', error);
    res.status(500).json({ error: 'Lỗi server khi lấy exam scores' });
  }
};

// Lấy điểm theo tuần (theo weekNumber)
exports.getClassAcademicScoresByWeek = async (req, res) => {
  try {
    const { weekNumber } = req.query;
    const scores = await ClassAcademicScore.find({ weekNumber: Number(weekNumber) });
    res.json(scores);
  } catch (err) {
    console.error('Lỗi khi lấy điểm theo tuần:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy điểm theo tuần' });
  }
};

// Thêm mới hoặc ghi đè toàn bộ điểm theo tuần (POST)
exports.saveClassAcademicScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;

    // Xoá dữ liệu cũ trước khi insert mới
    await ClassAcademicScore.deleteMany({ weekNumber: Number(weekNumber) });

    // Tạo dữ liệu mới
    const newScores = await ClassAcademicScore.insertMany(
      scores.map(s => ({
        className: s.className,
        grade: s.grade,
        weekNumber: Number(weekNumber),
        score: s.score,
      }))
    );

    res.json({ message: 'Đã lưu điểm học tập', data: newScores });
  } catch (err) {
    console.error('Lỗi khi lưu ClassAcademicScores:', err);
    res.status(500).json({ error: 'Lỗi server khi lưu ClassAcademicScores', detail: err.message });
  }
};

// Cập nhật điểm tuần hiện tại (PUT)
exports.updateClassAcademicScores = async (req, res) => {
  try {
    const { weekNumber, scores } = req.body;

    const updatePromises = scores.map(async (s) => {
      return ClassAcademicScore.findOneAndUpdate(
        { className: s.className, grade: s.grade, weekNumber: Number(weekNumber) },
        { score: s.score },
        { new: true, upsert: true }
      );
    });

    const updatedScores = await Promise.all(updatePromises);

    res.json({ message: 'Đã cập nhật điểm học tập', data: updatedScores });
  } catch (err) {
    console.error('Lỗi khi cập nhật ClassAcademicScores:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật ClassAcademicScores', detail: err.message });
  }
};
