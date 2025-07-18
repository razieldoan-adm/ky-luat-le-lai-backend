const mongoose = require('mongoose');

const classAcademicScoreSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  score: { type: Number, default: 0 },
});

module.exports = mongoose.model('ClassAcademicScore', classAcademicScoreSchema);
