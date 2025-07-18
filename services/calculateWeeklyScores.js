const ClassWeeklyScore = require('../models/ClassWeeklyScore');
const ClassAcademicScore = require('../models/ClassAcademicScore');
const ClassAttendanceSummary = require('../models/ClassAttendanceSummary');
const ClassHygieneScore = require('../models/ClassHygieneScore');
const ClassLineUpSummary = require('../models/ClassLineUpSummary');
const ClassViolationScore = require('../models/ClassViolationScore');
const Settings = require('../models/Setting');

exports.calculateWeeklyScores = async (weekNumber) => {
  const settings = await Settings.findOne();
  const maxDiscipline = settings.maxWeeklyDisciplineScore || 100;
  const maxHygiene = settings.maxWeeklyHygieneScore || 100;
  const maxAttendance = settings.maxWeeklyAttendanceScore || 100;
  const maxLineUp = settings.maxWeeklyLineUpScore || 100;

  const classes = await ClassAcademicScore.find({ weekNumber });

  const results = await Promise.all(classes.map(async (cls) => {
    const discipline = await ClassViolationScore.findOne({ className: cls.className, weekNumber });
    const hygiene = await ClassHygieneScore.findOne({ className: cls.className, weekNumber });
    const attendance = await ClassAttendanceSummary.findOne({ className: cls.className, weekNumber });
    const lineup = await ClassLineUpSummary.findOne({ className: cls.className, weekNumber });

    const disciplineScore = maxDiscipline - (discipline?.totalScore || 0);
    const hygieneScore = maxHygiene - (hygiene?.totalScore || 0);
    const attendanceScore = maxAttendance - (attendance?.total || 0);
    const lineUpScore = lineup?.total || 0;

    return {
      className: cls.className,
      grade: cls.grade,
      academicScore: cls.score,
      disciplineScore,
      hygieneScore,
      attendanceScore,
      lineUpScore,
      totalScore: 0,
      rank: 0
    };
  }));

  return results;
};
