const Attendance = require('../models/Attendance');
const Hygiene = require('../models/Hygiene');
const Lineup = require('../models/Lineup');
const Violation = require('../models/Violation');
const Student = require('../models/Student');

exports.getWeeklyReport = async (req, res) => {
  try {
    const { weekNumber } = req.query;

    // Chuyên cần tổng
    const attendanceSummary = await Attendance.aggregate([
      { $match: { weekNumber: Number(weekNumber) } },
      { $group: {
        _id: '$className',
        total: { $sum: 1 },
        present: { $sum: { $cond: ['$present', 1, 0] } },
        absent: { $sum: { $cond: ['$present', 0, 1] } },
      }},
      { $project: {
        className: '$_id',
        total: 1,
        present: 1,
        absent: 1,
        _id: 0
      }}
    ]);

    // Vệ sinh tổng
    const hygieneSummary = await Hygiene.find({ weekNumber: Number(weekNumber) })
      .select('className score -_id');

    // Lineup tổng
    const lineupSummary = await Lineup.find({ weekNumber: Number(weekNumber) })
      .select('className score -_id');

    // Vi phạm từng lớp
    const violations = await Violation.find({ weekNumber: Number(weekNumber) })
      .populate('student', 'fullName className')
      .populate('violationType', 'name');

    const violationsByClass = {};
    violations.forEach(v => {
      const className = v.student.className;
      if (!violationsByClass[className]) violationsByClass[className] = [];

      violationsByClass[className].push({
        studentName: v.student.fullName,
        violationName: v.violationType.name,
        date: v.date.toLocaleDateString('vi-VN'),
      });
    });

    res.json({
      weekNumber: Number(weekNumber),
      attendanceSummary,
      hygieneSummary,
      lineupSummary,
      violationsByClass
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
