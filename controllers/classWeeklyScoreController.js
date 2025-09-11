const ClassWeeklyScore = require('../models/ClassWeeklyScore');

// 📌 Save mới
exports.saveScore = async (req, res) => {
  try {
    const { className, grade, weekNumber, academicScore, hygieneScore, attendanceScore, lineUpScore } = req.body;

    const newScore = new ClassWeeklyScore({
      className,
      grade,
      weekNumber,
      academicScore,
      hygieneScore,
      attendanceScore,
      lineUpScore,
    });

    await newScore.save();
    res.status(201).json(newScore);
  } catch (err) {
    console.error('Lỗi khi lưu score:', err);
    res.status(500).json({ error: 'Lỗi server khi lưu score' });
  }
};

// 📌 Update lại
exports.updateScore = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await ClassWeeklyScore.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy dữ liệu' });

    res.json(updated);
  } catch (err) {
    console.error('Lỗi khi update score:', err);
    res.status(500).json({ error: 'Lỗi server khi update score' });
  }
};
