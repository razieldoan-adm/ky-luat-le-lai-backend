const mongoose = require('mongoose');

const classViolationScoreSchema = new mongoose.Schema({
  className: { type: String, required: true }, // ✅ chỉ cần className
  academicYear: {type: String, required: true,},
  weekNumber: { type: Number, required: true },
  totalScore: { type: Number, default: 0 },
});

module.exports = mongoose.model('ClassViolationScore', classViolationScoreSchema);
