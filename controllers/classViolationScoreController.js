const ClassViolationScore = require('../models/ClassViolationScore');
const AcademicWeek = require('../models/AcademicWeek');
// Tạo mới hoặc cập nhật điểm thi đua kỷ luật lớp theo tuần
const Class = require('../models/Class'); // đảm bảo import model Class

exports.createOrUpdateClassViolationScore = async (req, res) => {
  try {
    const { className, weekNumber, totalScore } = req.body;

    if (!className || !weekNumber || totalScore == null) {
      return res.status(400).json({ message: 'Thiếu dữ liệu cần thiết.' });
    }

    // Kiểm tra tồn tại
    let record = await ClassViolationScore.findOne({ className, weekNumber });

    if (record) {
      // Nếu đã tồn tại, cập nhật
      record.totalScore = totalScore;
      await record.save();
    } else {
      // Nếu chưa tồn tại, tạo mới
      record = await ClassViolationScore.create({
        className,
        weekNumber,
        totalScore,
      });
    }

    res.json(record);
  } catch (err) {
    console.error('Lỗi tạo/cập nhật class violation score:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};


// Lấy điểm thi đua kỷ luật của lớp theo tuần
exports.getClassViolationScore = async (req, res) => {
  try {
    const { className, weekNumber } = req.params;

    const record = await ClassViolationScore.findOne({ className, weekNumber })
      .populate('className', 'name')
      .populate('weekNumber', 'name startDate endDate');

    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy điểm thi đua.' });
    }

    res.json(record);
  } catch (err) {
    console.error('Lỗi lấy class violation score:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};
