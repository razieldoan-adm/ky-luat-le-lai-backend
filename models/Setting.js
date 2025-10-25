const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  maxConductScore: {
    type: Number,
    default: 100
  },
  maxClassAcademicScoresByGrade: {
    type: Map,
    of: Number,
    default: {},
  },
  minAcademicCountToRank: {
    type: Number,
    default: 5,
  },

  // 🆕 Giới hạn điểm tối đa tuần
  maxWeeklyDisciplineScore: {
    type: Number,
    default: 100, // ví dụ mặc định
  },
  classViolationLimit: { type: Number, default: 5 },
  maxWeeklyAttendanceScore: {
    type: Number,
    default: 100,
  },
  maxWeeklyHygieneScore: {
    type: Number,
    default: 100,
  },
  limitGVCNHandling: { type: Boolean, default: false },
  roles: {
    type: [
      {
        role: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
        permissions: [String],
      },
    ],
    default: [],
  },
});

module.exports = mongoose.model('Setting', settingSchema);
