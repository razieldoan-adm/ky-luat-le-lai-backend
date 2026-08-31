const mongoose = require('mongoose');

const academicWeekSchema = new mongoose.Schema({

  startDate: Date,
  endDate: Date,
  academicYear: { type: String, required: true },
  weekNumber: {type: Number, default: null},
  isStudyWeek: { type: Boolean, default: false },
});

module.exports = mongoose.model('AcademicWeek', academicWeekSchema);
