const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const Setting = require('../models/Setting');

// Lấy điểm thi đua theo tuần
const getWeeklyScores = async (req, res) => {
  try {
    const { weekNumber } = req.params;

    // Lấy cấu hình từ settings
    const settings = await Setting.findOne();
    if (!settings) {
      return res.status(400).json({ message: 'Chưa có cấu hình hệ thống' });
    }

    const classes = await ClassWeeklyScore.find({ weekNumber });

    // Gom theo khối (grade)
    const grouped = {};
    classes.forEach(cls => {
      const totalViolation =
        (cls.violationScore || 0) +
        (cls.cleanlinessScore || 0) +
        (cls.attendanceScore || 0) +
        (cls.lineScore || 0);

      // ✅ Công thức mới
      const totalDiscipline = settings.maxDisciplineScore - totalViolation;
      const finalScore =
        (cls.bonusScore || 0) +
        (cls.academicScore || 0) +
        totalDiscipline;

      // Gắn vào object
      if (!grouped[cls.grade]) grouped[cls.grade] = [];
      grouped[cls.grade].push({
        className: cls.className,
        grade: cls.grade,
        academicScore: cls.academicScore,
        bonusScore: cls.bonusScore,
        violationScore: cls.violationScore,
        cleanlinessScore: cls.cleanlinessScore,
        attendanceScore: cls.attendanceScore,
        lineScore: cls.lineScore,
        totalDiscipline,
        finalScore,
      });
    });

    // ✅ Xếp hạng trong từng khối
    Object.keys(grouped).forEach(grade => {
      grouped[grade]
        .sort((a, b) => b.finalScore - a.finalScore)
        .forEach((cls, index) => {
          cls.rank = index + 1;
        });
    });

    res.json(grouped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi lấy điểm tuần', error });
  }
};

module.exports = { getWeeklyScores };
